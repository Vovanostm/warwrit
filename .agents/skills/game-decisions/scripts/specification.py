"""Interview and specification records, review reports, and portable exports."""

from io import BytesIO
import json
import re
from zipfile import ZipFile, ZIP_DEFLATED


class ValidationError(ValueError):
    status = 400


def required_text(record, key):
    value = record.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValidationError(f"Поле {key} должно содержать текст.")
    return value


def text_list(record, key):
    values = record.get(key, [])
    if not isinstance(values, list) or not all(
        isinstance(value, str) and value.strip() for value in values
    ):
        raise ValidationError(f"Поле {key} должно быть массивом текстов.")
    return values


def validate_brief(raw):
    if not isinstance(raw, dict):
        raise ValidationError("Нужен объект brief с запросом и ответами.")
    result = {key: required_text(raw, key) for key in ("title", "request", "goal", "output")}
    for key in ("fixed", "vary", "requirements", "openQuestions"):
        result[key] = text_list(raw, key)
    result["status"] = raw.get("status", "interviewing")
    if result["status"] not in ("interviewing", "ready"):
        raise ValidationError("Статус брифа должен быть interviewing или ready.")
    answers = raw.get("answers", [])
    if not isinstance(answers, list) or not all(isinstance(answer, dict) for answer in answers):
        raise ValidationError("answers должен быть массивом вопросов и ответов.")
    result["answers"] = [
        {"question": required_text(answer, "question"), "answer": required_text(answer, "answer")}
        for answer in answers
    ]
    counts = raw.get("counts", {})
    if not isinstance(counts, dict):
        raise ValidationError("counts должен содержать число концептов поиска и уточнения.")
    result["counts"] = {"explore": counts.get("explore", 10), "refine": counts.get("refine", 3)}
    if any(type(value) is not int or value < 1 for value in result["counts"].values()):
        raise ValidationError("Количество концептов должно быть положительным целым числом.")
    return result


def validate_artifact(raw, master):
    if not isinstance(raw, dict):
        raise ValidationError("Нужен объект artifact с ТЗ и рабочим промптом.")
    result = {key: required_text(raw, key) for key in ("title", "summary")}
    result["requirements"] = text_list(raw, "requirements")
    result["acceptance"] = text_list(raw, "acceptance")
    result["openQuestions"] = text_list(raw, "openQuestions")
    generation = raw.get("generation")
    if not isinstance(generation, dict) or not isinstance(generation.get("parameters", {}), dict):
        raise ValidationError("Нужны generation и объект parameters.")
    allowed = [master["card"]["image"], *master["card"]["generation"]["references"]]
    references = generation.get("references", list(dict.fromkeys(allowed)))
    if not isinstance(references, list) or not all(reference in allowed for reference in references):
        raise ValidationError("Референсы рабочего промпта должны происходить из принятого концепта.")
    result["generation"] = {
        "generator": required_text(generation, "generator"),
        "prompt": required_text(generation, "prompt"),
        "parameters": generation.get("parameters", {}),
        "references": references,
    }
    return result


def validate_review(raw):
    if not isinstance(raw, dict):
        raise ValidationError("Нужен объект review с результатом проверки ИИ.")
    summary = required_text(raw, "summary")
    issues = text_list(raw, "issues")
    checks = raw.get("checks")
    if not isinstance(checks, list) or not checks or not all(isinstance(check, dict) for check in checks):
        raise ValidationError("У проверки должны быть критерии и наблюдения.")
    checked = []
    for check in checks:
        if check.get("result") not in ("pass", "fail"):
            raise ValidationError("Результат критерия должен быть pass или fail.")
        checked.append({
            "criterion": required_text(check, "criterion"), "result": check["result"],
            "evidence": required_text(check, "evidence"),
        })
    status = "needs_changes"
    if not issues and all(check["result"] == "pass" for check in checked):
        status = "verified"
    return {"summary": summary, "issues": issues, "checks": checked, "status": status}


def documentation_state(document):
    briefs = {}
    artifacts = {}
    for event in document["history"]:
        if event["type"] == "brief-saved":
            briefs[event["componentId"]] = event
        elif event["type"] == "artifact-drafted":
            artifacts[event["approvalId"]] = {**event, "status": "awaiting_review", "review": None}
        elif event["type"] == "artifact-reviewed":
            artifact = artifacts.get(event["approvalId"])
            if artifact and artifact["revision"] == event["revision"]:
                artifact["review"] = event
                artifact["status"] = event["review"]["status"]
    return briefs, artifacts


def question_versions(snapshot):
    questions = {}
    for event in snapshot["history"]:
        question = event.get("question", {})
        if "cards" in question:
            questions[(question["id"], question["revision"])] = question
    for question in snapshot["questions"]:
        questions[(question["id"], question["revision"])] = question
    return list(questions.values())


def portable_document(value):
    """Convert media links to archive-relative paths, retaining literal prompt text."""
    if isinstance(value, list):
        return [portable_document(item) for item in value]
    if not isinstance(value, dict):
        return value
    result = {}
    for key, item in value.items():
        if key == "image" and isinstance(item, str) and item.startswith("/media/"):
            result[key] = item.lstrip("/")
        elif key == "references" and isinstance(item, list):
            result[key] = [
                reference.lstrip("/")
                if isinstance(reference, str) and reference.startswith("/media/")
                else reference
                for reference in item
            ]
        else:
            result[key] = portable_document(item)
    return result


def literal_block(text):
    longest = max((len(match) for match in re.findall(r"`+", text)), default=0)
    fence = "`" * max(3, longest + 1)
    return f"{fence}\n{text}\n{fence}"


def specification_markdown(snapshot):
    lines = [f"# {snapshot['project']} — решения и ТЗ", ""]
    brief_sections = (
        ("Ограничения", "fixed"),
        ("Варьируемые черты", "vary"),
        ("Требования", "requirements"),
        ("Открытые вопросы", "openQuestions"),
    )
    for component, saved in snapshot["briefs"].items():
        brief = saved["brief"]
        lines.extend([
            f"## {brief['title']}",
            "",
            f"Часть `{component}`, бриф {saved['revision']}.",
            "",
            brief["request"],
            "",
            brief["goal"],
            "",
            brief["output"],
            "",
        ])
        for answer in brief["answers"]:
            lines.extend([f"**{answer['question']}**", "", answer["answer"], ""])
        for label, key in brief_sections:
            if brief[key]:
                lines.extend([f"### {label}", ""])
                lines.extend(f"- {value}" for value in brief[key])
                lines.append("")
    lines.extend(["## Принятые решения", ""])
    if not snapshot["masters"]:
        lines.extend(["Решения появятся после финального выбора владельца.", ""])
    artifact_sections = (
        ("Требования", "requirements"),
        ("Приёмка", "acceptance"),
        ("Открытые вопросы", "openQuestions"),
    )
    for component, master in snapshot["masters"].items():
        card = master["card"]
        record = master.get("document")
        lines.extend([
            f"### {card['title']}",
            "",
            f"Часть `{component}`, раунд `{master['questionId']}`, редакция {master['revision']}.",
            "",
            f"![{card['title']}]({card['image']})",
            "",
            card["summary"],
            "",
            "#### Бриф принятого концепта",
            "",
            literal_block(json.dumps(master["brief"], ensure_ascii=False, indent=2)),
            "",
            "#### Исходный промпт концепта",
            "",
            literal_block(card["generation"]["prompt"]),
            "",
        ])
        if record is None:
            lines.extend(["Ожидается рабочий промпт и ТЗ от ИИ.", ""])
            continue
        artifact = record["artifact"]
        lines.extend(["#### ТЗ", "", artifact["title"], "", artifact["summary"], ""])
        for label, key in artifact_sections:
            if artifact[key]:
                lines.extend([f"**{label}**", ""])
                lines.extend(f"- {value}" for value in artifact[key])
                lines.append("")
        lines.extend([
            "#### Рабочий промпт",
            "",
            literal_block(artifact["generation"]["prompt"]),
            "",
            f"Редакция {record['revision']}, состояние `{record['status']}`.",
            f"Подготовил {record['createdBy']}.",
            "",
        ])
        if record["review"]:
            review = record["review"]["review"]
            lines.extend([
                "#### Проверка ИИ",
                "",
                review["summary"],
                "",
                f"Проверил {record['review']['createdBy']}.",
                "",
            ])
            for check in review["checks"]:
                lines.append(f"- [{check['result']}] {check['criterion']} — {check['evidence']}")
            lines.extend(["", *[f"- {issue}" for issue in review["issues"]], ""])
    lines.extend(["## Уточнения и происхождение", ""])
    for request in snapshot["requests"]:
        lines.extend([
            f"### {request['question']['title']}",
            "",
            f"Запрос `{request['id']}`, состояние `{request['status']}`.",
            "",
            request["notes"],
            "",
            f"Выбраны {', '.join(request['selected'])}. Запрошено вариантов {request['nextCount']}.",
            "",
        ])
    return "\n".join(lines)


def export_package(snapshot, media_directory):
    portable = portable_document(snapshot)
    archive = BytesIO()
    with ZipFile(archive, "w", compression=ZIP_DEFLATED) as output:
        output.writestr("project.json", json.dumps(portable, ensure_ascii=False, indent=2))
        output.writestr("specification.md", specification_markdown(portable))
        for component, master in portable["masters"].items():
            output.writestr(f"decisions/{component}.json", json.dumps(master, ensure_ascii=False, indent=2))
        media = set()
        for question in question_versions(portable):
            for card in question["cards"]:
                if card.get("image"):
                    media.add(card["image"])
                generation = card.get("generation")
                if generation:
                    media.update(generation["references"])
                    name = f"prompts/{question['id']}/r{question['revision']}/{card['id']}.json"
                    output.writestr(name, json.dumps(generation, ensure_ascii=False, indent=2))
        for name in sorted(media):
            path = media_directory / name.removeprefix("media/")
            output.write(path, name)
    return archive.getvalue()
