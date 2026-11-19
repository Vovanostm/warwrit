#!/usr/bin/env python3
"""Project-local decision cards, durable votes, and an agent-readable export."""

import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
import os
from pathlib import Path
import re
import tempfile
import time
import uuid

from specification import (
    ValidationError, documentation_state, export_package, portable_document,
    specification_markdown, validate_artifact, validate_brief, validate_review,
)


SKILL = Path(__file__).resolve().parents[1]
IDENTIFIER = re.compile(r"[a-z0-9][a-z0-9_-]{0,79}\Z")
MEDIA_NAME = re.compile(r"[a-f0-9]{64}\.(png|jpg|jpeg|webp|gif)\Z")


class DecisionError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def timestamp():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def text_field(record, key, required=True, trim=True):
    value = record.get(key, "")
    if not isinstance(value, str) or (required and not value.strip()):
        raise DecisionError(f"Поле {key} должно содержать текст.")
    return value.strip() if trim else value


def identifier(record, key):
    value = text_field(record, key)
    if not IDENTIFIER.fullmatch(value):
        raise DecisionError(f"Поле {key} содержит недопустимый ID.")
    return value


def prepare_board(raw, project_root, media_root):
    project_root = Path(project_root).resolve()
    if not isinstance(raw, dict) or not isinstance(raw.get("questions"), list):
        raise DecisionError("Ожидается объект с массивом questions.")
    project = text_field(raw, "project")
    questions = []
    question_ids = set()
    images = []

    def media_path(image):
        path = (project_root / image).resolve()
        if not path.is_relative_to(project_root) or not path.is_file():
            raise DecisionError("Изображение должно находиться внутри проекта.")
        extension = path.suffix.lower()
        if extension not in (".png", ".jpg", ".jpeg", ".webp", ".gif"):
            raise DecisionError("Используйте PNG, JPEG, WebP или GIF.")
        content = path.read_bytes()
        name = hashlib.sha256(content).hexdigest() + extension
        images.append((name, content))
        return "/media/" + name

    for source in raw["questions"]:
        if not isinstance(source, dict):
            raise DecisionError("Каждый вопрос должен быть объектом.")
        question_id = identifier(source, "id")
        if question_id in question_ids:
            raise DecisionError("ID вопросов должны различаться.")
        question_ids.add(question_id)
        mode = source.get("mode", "single")
        if mode not in ("single", "multiple"):
            raise DecisionError("Режим вопроса должен быть single или multiple.")
        cards = source.get("cards")
        if not isinstance(cards, list) or not cards:
            raise DecisionError("У вопроса должен быть хотя бы один вариант.")
        question = {
            "id": question_id,
            "topic": text_field(source, "topic"),
            "title": text_field(source, "title"),
            "context": text_field(source, "context", False),
            "mode": mode,
            "cards": [],
        }
        study = source.get("study")
        if study is not None:
            if not isinstance(study, dict):
                raise DecisionError("study должен быть объектом.")
            phase = study.get("phase")
            if phase not in ("explore", "refine", "final"):
                raise DecisionError("phase должен быть explore, refine или final.")
            if mode != ("single" if phase == "final" else "multiple"):
                raise DecisionError("Финал требует single, поиск и уточнение — multiple.")
            brief = study.get("brief")
            if not isinstance(brief, dict):
                raise DecisionError("Нужен бриф отдельной части игры.")
            for key in ("fixed", "vary"):
                if not isinstance(brief.get(key), list) or not all(
                    isinstance(value, str) and value.strip() for value in brief[key]
                ):
                    raise DecisionError(f"brief.{key} должен быть массивом текстов.")
            question["study"] = {
                "componentId": identifier(study, "componentId"),
                "phase": phase,
                "brief": {**brief, "goal": text_field(brief, "goal")},
            }
            if "briefRevision" in study:
                if type(study["briefRevision"]) is not int or study["briefRevision"] < 1:
                    raise DecisionError("briefRevision должна быть положительным целым числом.")
                question["study"]["briefRevision"] = study["briefRevision"]
            if "execution" in study:
                if not isinstance(study["execution"], dict):
                    raise DecisionError("execution должен описывать фактический запуск партии.")
                question["study"]["execution"] = study["execution"]
            if "parentFeedbackId" in study:
                question["study"]["parentFeedbackId"] = identifier(study, "parentFeedbackId")
            elif phase != "explore":
                raise DecisionError("Уточнение и финал должны ссылаться на parentFeedbackId.")
        card_ids = set()
        for item in cards:
            if not isinstance(item, dict):
                raise DecisionError("Карточка должна быть объектом.")
            card_id = identifier(item, "id")
            if card_id in card_ids:
                raise DecisionError("ID карточек в одном вопросе должны различаться.")
            card_ids.add(card_id)
            card = {"id": card_id}
            for key in ("title", "summary", "consequence", "source"):
                card[key] = text_field(item, key, key in ("title", "summary", "consequence"))
            card["image"] = ""
            image = text_field(item, "image", False)
            if image:
                card["image"] = media_path(image)
            generation = item.get("generation")
            if study is not None or generation is not None:
                if not isinstance(generation, dict):
                    raise DecisionError("Каждому концепту нужен generation с точным промптом.")
                parameters = generation.get("parameters", {})
                references = generation.get("references", [])
                if not isinstance(parameters, dict) or not isinstance(references, list) or not all(
                    isinstance(reference, str) and reference.strip() for reference in references
                ):
                    raise DecisionError("Нужны объект parameters и массив путей references.")
                card["generation"] = {
                    "generator": text_field(generation, "generator"),
                    "prompt": text_field(generation, "prompt", trim=False),
                    "parameters": parameters,
                    "references": [media_path(reference) for reference in references],
                }
                if "execution" in generation:
                    if not isinstance(generation["execution"], dict):
                        raise DecisionError("generation.execution должен быть объектом.")
                    card["generation"]["execution"] = generation["execution"]
            if study is not None and not image:
                raise DecisionError("Концепт для выбора должен иметь сгенерированное изображение.")
            question["cards"].append(card)
        questions.append(question)
    # Validate the entire board before creating its immutable image copies.
    media_root.mkdir(parents=True, exist_ok=True)
    for name, content in images:
        path = media_root / name
        if not path.exists():
            atomic_write(path, content)
    return project, questions


def atomic_write(path, content):
    descriptor, temporary = tempfile.mkstemp(prefix=".pending-", dir=path.parent)
    try:
        with os.fdopen(descriptor, "wb") as output:
            output.write(content)
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


def concept_state(document):
    feedback = {}
    masters = {}
    for event in document["history"]:
        if event["type"] == "master-revoked":
            component = event["componentId"]
            if masters.get(component, {}).get("approvalId") == event["approvalId"]:
                masters.pop(component, None)
            continue
        question = event.get("question", {})
        if event["type"] == "feedback":
            feedback[question["id"]] = event
        study = question.get("study", {})
        if event["type"] != "vote" or study.get("phase") != "final":
            continue
        component = study["componentId"]
        if event["selected"]:
            card = next(card for card in question["cards"] if card["id"] in event["selected"])
            masters[component] = {
                "approvalId": event["id"],
                "componentId": component, "approvedAt": event["at"],
                "questionId": question["id"], "revision": question["revision"],
                "brief": study["brief"], "parentFeedbackId": study["parentFeedbackId"],
                "card": card,
            }
        elif masters.get(component, {}).get("questionId") == question["id"]:
            masters.pop(component, None)
    return feedback, masters


def generation_requests(document):
    children = {}
    for event in document["history"]:
        if event["type"] != "question-updated":
            continue
        question = event["question"]
        parent_id = question.get("study", {}).get("parentFeedbackId")
        if parent_id:
            children.setdefault(parent_id, {})[question["id"]] = {
                "questionId": question["id"], "revision": question["revision"],
                "title": question["title"], "phase": question["study"]["phase"],
            }
    requests = []
    for event in document["history"]:
        if event["type"] == "feedback":
            rounds = list(children.get(event["id"], {}).values())
            requests.append({**event, "status": "completed" if rounds else "pending", "children": rounds})
    return requests


def replay_receipt(document, board_id, request_id, fingerprint):
    """Validate board identity and replay an exact request's retained receipt."""
    if document["boardId"] != board_id:
        raise DecisionError("Открыт другой проект. Обновите страницу.", 409)
    receipt = document["receipts"].get(request_id)
    if receipt is None:
        return None
    if receipt["payload"] != fingerprint:
        raise DecisionError("Этот request ID уже относится к другому действию.", 409)
    return receipt["result"]


class Store:
    def __init__(self, directory):
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)
        self.path = self.directory / "decisions.json"

    @contextmanager
    def locked(self):
        with (self.directory / ".lock").open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            try:
                yield
            finally:
                fcntl.flock(lock, fcntl.LOCK_UN)

    def read(self):
        if not self.path.exists():
            return {"schemaVersion": 1, "boardId": str(uuid.uuid4()), "project": "Game", "revision": 0,
                    "questions": [], "votes": {}, "receipts": {}, "history": []}
        try:
            document = json.loads(self.path.read_text())
        except (OSError, ValueError) as error:
            raise DecisionError("Не удалось прочитать сохранённые решения.", 500) from error
        if not isinstance(document, dict) or document.get("schemaVersion") != 1:
            raise DecisionError("Версия сохранённых решений не поддерживается.", 500)
        required = {"boardId": str, "project": str, "revision": int, "questions": list,
                    "votes": dict, "receipts": dict, "history": list}
        if any(type(document.get(key)) is not kind for key, kind in required.items()):
            raise DecisionError("Структура сохранённых решений повреждена.", 500)
        return document

    def write(self, document):
        content = json.dumps(document, ensure_ascii=False, indent=2) + "\n"
        atomic_write(self.path, content.encode())

    def snapshot(self):
        with self.locked():
            document = self.read()
            if not self.path.exists():
                self.write(document)
        result = {key: value for key, value in document.items() if key != "receipts"}
        result["feedback"], result["masters"] = concept_state(document)
        result["requests"] = generation_requests(document)
        result["briefs"], result["documents"] = documentation_state(document)
        for master in result["masters"].values():
            master["document"] = result["documents"].get(master["approvalId"])
            master["status"] = master["document"]["status"] if master["document"] else "awaiting_prompt"
        return result

    def import_board(self, project, questions):
        with self.locked():
            document = self.read()
            existing = {question["id"]: question for question in document["questions"]}
            changed = project != document["project"]
            for question in questions:
                study = question.get("study", {})
                if "briefRevision" in study:
                    linked = next((event for event in document["history"] if event["type"] == "brief-saved"
                                   and event["componentId"] == study["componentId"]
                                   and event["revision"] == study["briefRevision"]), None)
                    if linked is None:
                        raise DecisionError("Сохранённая редакция брифа этой части не найдена.", 409)
                    if study["phase"] == "explore" and "parentFeedbackId" not in study:
                        count = linked["brief"].get("counts", {}).get("explore", 10)
                        if len(question["cards"]) != count:
                            raise DecisionError("Число концептов должно соответствовать сохранённому брифу.")
                parent_id = study.get("parentFeedbackId")
                if parent_id:
                    parent = next((event for event in document["history"]
                                   if event["id"] == parent_id and event["type"] == "feedback"), None)
                    if parent is None or parent["question"]["study"]["componentId"] != study["componentId"]:
                        raise DecisionError("Исходное уточнение этой части игры не найдено.", 409)
                    if len(question["cards"]) != parent["nextCount"]:
                        raise DecisionError("Число концептов должно соответствовать запросу уточнения.")
                previous = existing.get(question["id"])
                definition = dict(previous or {})
                definition.pop("revision", None)
                if definition == question:
                    continue
                replacement = {**question, "revision": (previous or {}).get("revision", 0) + 1}
                document["history"].append({
                    "id": str(uuid.uuid4()), "at": timestamp(), "type": "question-updated",
                    "question": replacement,
                    "previousSelection": document["votes"].get(question["id"], []),
                })
                existing[question["id"]] = replacement
                document["votes"][question["id"]] = []
                changed = True
            if changed:
                document["project"] = project
                document["questions"] = list(existing.values())
                document["revision"] += 1
                self.write(document)
        return self.snapshot()

    def vote(self, body):
        if not isinstance(body, dict):
            raise DecisionError("Ожидается объект выбора.")
        question_id = identifier(body, "questionId")
        card_id = identifier(body, "cardId")
        request_id = identifier(body, "requestId")
        board_id = text_field(body, "boardId")
        if type(body.get("liked")) is not bool or type(body.get("revision")) is not int:
            raise DecisionError("Нужны liked и целая revision.")
        payload = {key: body[key] for key in ("boardId", "questionId", "cardId", "requestId", "liked", "revision")}
        fingerprint = json.dumps(payload, sort_keys=True)
        with self.locked():
            document = self.read()
            receipt = replay_receipt(document, board_id, request_id, fingerprint)
            if receipt is not None:
                return receipt
            question = next((q for q in document["questions"] if q["id"] == question_id), None)
            if question is None:
                raise DecisionError("Вопрос больше недоступен.", 404)
            if question["revision"] != body["revision"]:
                raise DecisionError("Карточки обновлены. Перечитайте варианты и выберите снова.", 409)
            if not any(card["id"] == card_id for card in question["cards"]):
                raise DecisionError("Вариант больше недоступен.", 404)
            selected = list(document["votes"].get(question_id, []))
            if body["liked"]:
                if question["mode"] == "single":
                    selected = [card_id]
                elif card_id not in selected:
                    selected.append(card_id)
            elif card_id in selected:
                selected.remove(card_id)
            changed = selected != document["votes"].get(question_id, [])
            if changed:
                document["revision"] += 1
                document["votes"][question_id] = selected
                event = {"id": request_id, "at": timestamp(), "type": "vote",
                         "question": question, "selected": selected}
                document["history"].append(event)
            result = {"ok": True, "questionId": question_id, "selected": selected,
                      "revision": question["revision"], "changed": changed,
                      "eventId": request_id if changed else None}
            document["receipts"][request_id] = {"payload": fingerprint, "result": result}
            self.write(document)
        return result

    def feedback(self, body):
        if not isinstance(body, dict):
            raise DecisionError("Ожидается объект уточнения.")
        question_id = identifier(body, "questionId")
        request_id = identifier(body, "requestId")
        board_id = text_field(body, "boardId")
        notes = text_field(body, "notes", False, trim=False)
        if type(body.get("revision")) is not int or type(body.get("nextCount")) is not int:
            raise DecisionError("Нужны целые revision и nextCount.")
        if body["nextCount"] < 1:
            raise DecisionError("Нужно хотя бы одно новое изображение.")
        selected = body.get("selected")
        if not isinstance(selected, list) or not selected or not all(isinstance(item, str) for item in selected):
            raise DecisionError("Сначала выберите исходные концепты.")
        payload = {key: body[key] for key in (
            "boardId", "questionId", "requestId", "revision", "nextCount", "selected"
        )}
        payload["notes"] = notes
        fingerprint = json.dumps({**payload, "action": "feedback"}, sort_keys=True)
        with self.locked():
            document = self.read()
            receipt = replay_receipt(document, board_id, request_id, fingerprint)
            if receipt is not None:
                return receipt
            question = next((q for q in document["questions"] if q["id"] == question_id), None)
            if question is None or "study" not in question:
                raise DecisionError("Уточнение доступно для раунда концептов.")
            if question["revision"] != body["revision"] or document["votes"].get(question_id, []) != selected:
                raise DecisionError("Выбор или концепты изменились. Обновите страницу и уточните снова.", 409)
            event = {"id": request_id, "type": "feedback", "at": timestamp(),
                     "question": question, "selected": selected, "notes": notes,
                     "nextCount": body["nextCount"]}
            document["history"].append(event)
            document["revision"] += 1
            result = {"ok": True, "eventId": request_id, "questionId": question_id,
                      "revision": question["revision"], "action": "feedback"}
            document["receipts"][request_id] = {"payload": fingerprint, "result": result}
            self.write(document)
        return result

    def revoke(self, body):
        if not isinstance(body, dict):
            raise DecisionError("Ожидается объект отзыва утверждения.")
        component = identifier(body, "componentId")
        approval_id = identifier(body, "approvalId")
        request_id = identifier(body, "requestId")
        board_id = text_field(body, "boardId")
        payload = {key: body[key] for key in ("boardId", "componentId", "approvalId", "requestId")}
        fingerprint = json.dumps({**payload, "action": "revoke"}, sort_keys=True)
        with self.locked():
            document = self.read()
            receipt = replay_receipt(document, board_id, request_id, fingerprint)
            if receipt is not None:
                return receipt
            master = concept_state(document)[1].get(component)
            if master is None or master["approvalId"] != approval_id:
                raise DecisionError("Основной концепт изменился. Обновите страницу перед отзывом.", 409)
            question = next((q for q in document["questions"] if q["id"] == master["questionId"]), None)
            if question is not None and question["revision"] == master["revision"]:
                document["votes"][question["id"]] = []
            document["history"].append({
                "id": request_id, "at": timestamp(), "type": "master-revoked",
                "componentId": component, "approvalId": approval_id,
                "question": {"id": master["questionId"], "title": master["card"]["title"]},
            })
            document["revision"] += 1
            result = {"ok": True, "action": "revoke", "componentId": component, "eventId": request_id}
            document["receipts"][request_id] = {"payload": fingerprint, "result": result}
            self.write(document)
        return result

    def export(self):
        document = self.snapshot()
        for feedback in list(document["feedback"].values()) + document["requests"]:
            feedback["selectedImages"] = [
                str((self.directory / card["image"].lstrip("/")).resolve())
                for card in feedback["question"]["cards"] if card["id"] in feedback["selected"]
            ]
        decisions = []
        for question in document["questions"]:
            selected = document["votes"].get(question["id"], [])
            if selected:
                decisions.append({"questionId": question["id"], "revision": question["revision"],
                                  "question": question["title"], "topic": question["topic"],
                                  "study": question.get("study"),
                                  "cards": [card for card in question["cards"] if card["id"] in selected]})
        return {"schemaVersion": 1, "project": document["project"],
                "boardId": document["boardId"],
                "revision": document["revision"], "decisions": decisions,
                "feedback": document["feedback"], "masters": document["masters"],
                "requests": document["requests"], "briefs": document["briefs"],
                "documents": document["documents"]}

    def save_document(self, kind, body):
        if kind not in ("brief", "artifact", "review") or not isinstance(body, dict):
            raise DecisionError("Нужен объект документа и известное действие.")
        component = identifier(body, "componentId")
        request_id = identifier(body, "requestId")
        board_id = text_field(body, "boardId")
        author = text_field(body, "createdBy", False) or "agent"
        fingerprint = json.dumps({**body, "action": kind}, sort_keys=True, allow_nan=False)
        with self.locked():
            document = self.read()
            receipt = replay_receipt(document, board_id, request_id, fingerprint)
            if receipt is not None:
                return receipt
            briefs, artifacts = documentation_state(document)
            event = {"id": request_id, "at": timestamp(), "componentId": component, "createdBy": author}
            if kind == "brief":
                current = briefs.get(component)
                revision = current["revision"] if current else 0
                if type(body.get("expectedRevision")) is not int or body["expectedRevision"] != revision:
                    raise DecisionError("Бриф изменился. Прочитайте его текущую редакцию.", 409)
                event.update(type="brief-saved", revision=revision + 1, brief=validate_brief(body.get("brief")))
            else:
                approval_id = identifier(body, "approvalId")
                master = concept_state(document)[1].get(component)
                if master is None or master["approvalId"] != approval_id:
                    raise DecisionError("Принятое решение изменилось. Прочитайте текущий выбор.", 409)
                current = artifacts.get(approval_id)
                revision = current["revision"] if current else 0
                event["approvalId"] = approval_id
                if kind == "artifact":
                    if type(body.get("expectedRevision")) is not int or body["expectedRevision"] != revision:
                        raise DecisionError("Редакция ТЗ или промпта изменилась. Обновите документ.", 409)
                    event.update(type="artifact-drafted", revision=revision + 1,
                                 artifact=validate_artifact(body.get("artifact"), master))
                else:
                    if current is None or type(body.get("revision")) is not int or body["revision"] != revision:
                        raise DecisionError("Проверка должна относиться к текущей редакции ТЗ и промпта.", 409)
                    event.update(type="artifact-reviewed", revision=revision, review=validate_review(body.get("review")))
            document["history"].append(event)
            document["revision"] += 1
            result = {"ok": True, "action": kind, "eventId": request_id, "revision": event["revision"]}
            document["receipts"][request_id] = {"payload": fingerprint, "result": result}
            self.write(document)
        return result

    def specification(self):
        return specification_markdown(portable_document(self.snapshot()))

    def package(self):
        return export_package(self.snapshot(), self.directory / "media")

    def work(self):
        snapshot = self.snapshot()
        actions = []
        for component, saved in snapshot["briefs"].items():
            linked = any(question.get("study", {}).get("componentId") == component
                         and question["study"].get("briefRevision") == saved["revision"]
                         for question in snapshot["questions"])
            if saved["brief"]["status"] == "ready" and not linked:
                actions.append({"action": "generate_exploration", "componentId": component,
                                "briefRevision": saved["revision"],
                                "count": saved["brief"].get("counts", {}).get("explore", 10)})
        for request in snapshot["requests"]:
            if request["status"] == "pending":
                actions.append({"action": "generate_refinement", "componentId": request["question"]["study"]["componentId"],
                                "parentFeedbackId": request["id"], "count": request["nextCount"]})
        document_actions = {"awaiting_prompt": "write_specification", "awaiting_review": "review_specification",
                            "needs_changes": "revise_specification"}
        for component, master in snapshot["masters"].items():
            if master["status"] in document_actions:
                actions.append({"action": document_actions[master["status"]], "componentId": component,
                                "approvalId": master["approvalId"],
                                "revision": master["document"]["revision"] if master["document"] else 0})
        return {"project": snapshot["project"], "revision": snapshot["revision"], "actions": actions}

    def masters(self):
        snapshot = self.snapshot()
        # Export local paths that the agent can pass to its generation tools.
        masters = json.loads(json.dumps(snapshot["masters"]))
        for master in masters.values():
            card = master["card"]
            card["image"] = str((self.directory / card["image"].lstrip("/")).resolve())
            generations = [card["generation"]]
            if master["document"]:
                generations.append(master["document"]["artifact"]["generation"])
            for generation in generations:
                generation["references"] = [
                    str((self.directory / reference.lstrip("/")).resolve())
                    for reference in generation["references"]
                ]
        return {"schemaVersion": 1, "project": snapshot["project"], "masters": masters}


def make_server(store, port):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def allowed_host(self):
            return self.headers.get("Host") in (f"127.0.0.1:{self.server.server_port}",
                                                f"localhost:{self.server.server_port}")

        def send(self, status, content, content_type="application/json; charset=utf-8"):
            if not isinstance(content, bytes):
                content = json.dumps(content, ensure_ascii=False).encode()
            try:
                self.send_response(status)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(content)))
                self.send_header("Cache-Control", "no-store")
                self.send_header("X-Content-Type-Options", "nosniff")
                self.end_headers()
                self.wfile.write(content)
            except (BrokenPipeError, ConnectionResetError):
                self.close_connection = True

        def do_GET(self):
            try:
                if not self.allowed_host():
                    raise DecisionError("Недопустимый адрес сервиса.", 403)
                path = self.path.split("?", 1)[0]
                if path == "/api/board":
                    return self.send(200, store.snapshot())
                if path == "/api/project":
                    return self.send(200, store.snapshot())
                if path == "/api/decisions":
                    return self.send(200, store.export())
                if path == "/api/masters":
                    return self.send(200, store.masters())
                if path == "/api/requests":
                    exported = store.export()
                    return self.send(200, {"project": exported["project"], "requests": exported["requests"]})
                if path == "/api/briefs":
                    return self.send(200, {"briefs": store.snapshot()["briefs"]})
                if path == "/api/work":
                    return self.send(200, store.work())
                if path == "/api/specification.md":
                    return self.send(200, store.specification().encode(), "text/markdown; charset=utf-8")
                if path == "/api/export.zip":
                    return self.send(200, store.package(), "application/zip")
                if path == "/favicon.ico":
                    return self.send(204, b"", "image/x-icon")
                files = {"/": "index.html", "/app.js": "app.js", "/styles.css": "styles.css"}
                if path in files:
                    file = SKILL / "assets" / files[path]
                elif path.startswith("/media/") and MEDIA_NAME.fullmatch(path[7:]):
                    file = store.directory / "media" / path[7:]
                else:
                    raise DecisionError("Страница не найдена.", 404)
                if not file.is_file():
                    raise DecisionError("Изображение или страница недоступны.", 404)
                return self.send(200, file.read_bytes(), mimetypes.guess_type(file)[0] or "application/octet-stream")
            except (DecisionError, ValidationError) as error:
                self.send(error.status, {"error": str(error)})
            except OSError:
                self.send(500, {"error": "Не удалось прочитать данные сервиса."})

        def do_POST(self):
            try:
                origin = self.headers.get("Origin")
                origins = (f"http://127.0.0.1:{self.server.server_port}", f"http://localhost:{self.server.server_port}")
                if not self.allowed_host() or origin not in origins:
                    raise DecisionError("Сохранение доступно со страницы этого сервиса.", 403)
                actions = {"/api/vote": store.vote, "/api/feedback": store.feedback, "/api/revoke": store.revoke}
                documents = {"/api/brief": "brief", "/api/artifact": "artifact", "/api/review": "review"}
                if self.path not in actions and self.path not in documents:
                    raise DecisionError("Действие не найдено.", 404)
                if self.headers.get_content_type() != "application/json":
                    raise DecisionError("Ожидается JSON.")
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= 1024 * 1024:
                    raise DecisionError("Некорректный размер запроса.")
                body = json.loads(self.rfile.read(length))
                if self.path in documents:
                    return self.send(200, store.save_document(documents[self.path], body))
                self.send(200, actions[self.path](body))
            except (DecisionError, ValidationError) as error:
                self.send(error.status, {"error": str(error)})
            except (ValueError, UnicodeError):
                self.send(400, {"error": "Не удалось прочитать JSON запроса."})
            except OSError:
                self.send(500, {"error": "Не удалось сохранить выбор. Повторите тот же запрос."})

    return ThreadingHTTPServer(("127.0.0.1", port), Handler)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-root", type=Path, default=Path.cwd())
    parser.add_argument("--state-dir", type=Path, default=Path(".studioigor/decision-service"))
    commands = parser.add_subparsers(dest="command", required=True)
    load = commands.add_parser("import-board")
    load.add_argument("file", type=Path)
    serve = commands.add_parser("serve")
    serve.add_argument("--port", type=int, default=8783)
    commands.add_parser("export")
    commands.add_parser("project")
    commands.add_parser("history")
    commands.add_parser("masters")
    commands.add_parser("requests")
    commands.add_parser("briefs")
    commands.add_parser("specification")
    commands.add_parser("work")
    watch = commands.add_parser("watch")
    watch.add_argument("--after", type=int, required=True)
    watch.add_argument("--timeout", type=float, default=30)
    for name in ("save-brief", "save-artifact", "review-artifact"):
        command = commands.add_parser(name)
        command.add_argument("file", type=Path)
    bundle = commands.add_parser("export-package")
    bundle.add_argument("file", type=Path)
    args = parser.parse_args()
    project_root = args.project_root.resolve()
    store = Store(project_root / args.state_dir)
    try:
        if args.command == "import-board":
            raw = json.loads(args.file.read_text())
            project, questions = prepare_board(raw, project_root, store.directory / "media")
            snapshot = store.import_board(project, questions)
            print(json.dumps({"project": project, "questions": len(snapshot["questions"]),
                              "revision": snapshot["revision"]}, ensure_ascii=False))
        elif args.command == "export":
            print(json.dumps(store.export(), ensure_ascii=False, indent=2))
        elif args.command == "project":
            print(json.dumps(store.snapshot(), ensure_ascii=False, indent=2))
        elif args.command == "history":
            print(json.dumps(store.snapshot()["history"], ensure_ascii=False, indent=2))
        elif args.command == "masters":
            print(json.dumps(store.masters(), ensure_ascii=False, indent=2))
        elif args.command == "requests":
            exported = store.export()
            print(json.dumps({"project": exported["project"], "requests": exported["requests"]},
                             ensure_ascii=False, indent=2))
        elif args.command == "briefs":
            print(json.dumps(store.snapshot()["briefs"], ensure_ascii=False, indent=2))
        elif args.command == "specification":
            print(store.specification())
        elif args.command == "work":
            print(json.dumps(store.work(), ensure_ascii=False, indent=2))
        elif args.command == "watch":
            deadline = time.monotonic() + max(0, args.timeout)
            snapshot = store.snapshot()
            while snapshot["revision"] <= args.after and time.monotonic() < deadline:
                time.sleep(0.25)
                snapshot = store.snapshot()
            print(json.dumps({"changed": snapshot["revision"] > args.after, "revision": snapshot["revision"]}))
        elif args.command in ("save-brief", "save-artifact", "review-artifact"):
            kind = {"save-brief": "brief", "save-artifact": "artifact", "review-artifact": "review"}[args.command]
            result = store.save_document(kind, json.loads(args.file.read_text()))
            print(json.dumps(result, ensure_ascii=False))
        elif args.command == "export-package":
            args.file.parent.mkdir(parents=True, exist_ok=True)
            atomic_write(args.file, store.package())
            print(str(args.file.resolve()))
        else:
            server = make_server(store, args.port)
            print(f"Game Decisions — http://127.0.0.1:{server.server_port}/", flush=True)
            print(f"Project state — {store.path}", flush=True)
            try:
                server.serve_forever()
            except KeyboardInterrupt:
                pass
            finally:
                server.server_close()
    except (DecisionError, OSError, ValueError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
