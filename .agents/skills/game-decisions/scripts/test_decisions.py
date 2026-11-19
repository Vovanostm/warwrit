#!/usr/bin/env python3
"""Focused real-HTTP checks using an exclusively owned temporary project."""

from concurrent.futures import ThreadPoolExecutor
import copy
import json
from pathlib import Path
import tempfile
from threading import Thread
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen
import uuid
from io import BytesIO
from zipfile import ZipFile

from decisions import DecisionError, Store, make_server, prepare_board


class DecisionTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.store = Store(self.root / "state")
        self.raw = {
            "project": "Verification",
            "questions": [{
                "id": "direction", "topic": "Test", "title": "Choose", "mode": "single",
                "cards": [
                    {"id": "one", "title": "One", "summary": "First", "consequence": "Do first"},
                    {"id": "two", "title": "Two", "summary": "Second", "consequence": "Do second"},
                ],
            }],
        }
        self.import_raw()
        self.start_server()

    def start_server(self):
        self.server = make_server(self.store, 0)
        self.thread = Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.url = f"http://127.0.0.1:{self.server.server_port}"

    def stop_server(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()

    def tearDown(self):
        self.stop_server()
        self.temporary.cleanup()

    def import_raw(self):
        project, questions = prepare_board(self.raw, self.root, self.store.directory / "media")
        return self.store.import_board(project, questions)

    def body(self, card="one", liked=True):
        snapshot = self.store.snapshot()
        return {"boardId": snapshot["boardId"], "questionId": "direction", "cardId": card,
                "revision": snapshot["questions"][0]["revision"], "liked": liked,
                "requestId": str(uuid.uuid4())}

    def request(self, path, body=None, origin=None, host=None):
        headers = {"Origin": origin or self.url}
        data = None
        if body is not None:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
        if host:
            headers["Host"] = host
        request = Request(self.url + path, data=data, headers=headers)
        try:
            response = urlopen(request, timeout=5)
        except HTTPError as error:
            response = error
        with response:
            return response.status, json.loads(response.read())

    def test_single_replace_remove_and_server_restart(self):
        self.assertEqual(self.request("/api/vote", self.body())[0], 200)
        self.request("/api/vote", self.body("two"))
        self.assertEqual(self.store.snapshot()["votes"]["direction"], ["two"])
        self.request("/api/vote", self.body("two", False))
        self.assertEqual(self.store.snapshot()["votes"]["direction"], [])
        self.request("/api/vote", self.body())
        self.stop_server()
        self.store = Store(self.store.directory)
        self.start_server()
        status, exported = self.request("/api/decisions")
        self.assertEqual(status, 200)
        self.assertEqual(exported["decisions"][0]["cards"][0]["title"], "One")

    def test_empty_service_keeps_its_board_identity(self):
        self.stop_server()
        self.store = Store(self.root / "empty-state")
        self.start_server()
        first = self.request("/api/board")[1]
        second = self.request("/api/board")[1]
        self.assertEqual(first["boardId"], second["boardId"])
        self.assertEqual(first["questions"], [])
        self.raw["project"] = "Game"
        self.import_raw()
        self.assertEqual(self.request("/api/board")[1]["boardId"], first["boardId"])

    def test_multiple_concurrent_votes_are_both_saved(self):
        self.raw["questions"][0]["mode"] = "multiple"
        self.import_raw()
        bodies = [self.body("one"), self.body("two")]
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(lambda body: self.request("/api/vote", body), bodies))
        self.assertTrue(all(status == 200 for status, _ in results))
        self.assertEqual(set(self.store.snapshot()["votes"]["direction"]), {"one", "two"})

    def test_exact_retry_and_conflicting_request_id(self):
        body = self.body()
        first = self.request("/api/vote", body)
        self.assertEqual(first, self.request("/api/vote", body))
        self.assertEqual(len([e for e in self.store.snapshot()["history"] if e["type"] == "vote"]), 1)
        body["cardId"] = "two"
        self.assertEqual(self.request("/api/vote", body)[0], 409)
        self.assertEqual(self.store.snapshot()["votes"]["direction"], ["one"])

    def test_updated_proposal_requires_new_vote_and_preserves_history(self):
        body = self.body()
        receipt = self.request("/api/vote", body)
        self.import_raw()
        self.assertEqual(self.store.snapshot()["votes"]["direction"], ["one"])
        self.raw["questions"][0]["cards"][0]["consequence"] = "Changed consequence"
        self.import_raw()
        self.assertEqual(self.store.snapshot()["votes"]["direction"], [])
        self.assertEqual(self.request("/api/vote", body), receipt)
        body["requestId"] = str(uuid.uuid4())
        self.assertEqual(self.request("/api/vote", body)[0], 409)
        old_vote = next(event for event in self.store.snapshot()["history"] if event["type"] == "vote")
        self.assertEqual(old_vote["question"]["cards"][0]["consequence"], "Do first")

    def test_image_edits_create_new_immutable_media_and_revision(self):
        image = self.root / "concept.png"
        image.write_bytes(b"original-image-fixture")
        self.raw["questions"][0]["cards"][0]["image"] = "concept.png"
        before = self.import_raw()["questions"][0]
        image.write_bytes(b"updated-image-fixture")
        after = self.import_raw()["questions"][0]
        self.assertNotEqual(before["cards"][0]["image"], after["cards"][0]["image"])
        self.assertEqual(after["revision"], before["revision"] + 1)
        path = self.store.directory / "media" / before["cards"][0]["image"].split("/")[-1]
        self.assertEqual(path.read_bytes(), b"original-image-fixture")

    def test_rejected_origin_host_board_and_invalid_payload_preserve_state(self):
        original = self.store.path.read_bytes()
        self.assertEqual(self.request("/api/vote", self.body(), origin="https://unrelated.example")[0], 403)
        self.assertEqual(self.request("/api/board", host="unrelated.example")[0], 403)
        wrong_board = self.body()
        wrong_board["boardId"] = "another-project"
        self.assertEqual(self.request("/api/vote", wrong_board)[0], 409)
        invalid = self.body()
        invalid["liked"] = "yes"
        self.assertEqual(self.request("/api/vote", invalid)[0], 400)
        self.assertEqual(self.request("/media/../../decisions.json")[0], 404)
        self.assertEqual(self.store.path.read_bytes(), original)

    def test_bad_import_and_corrupt_file_do_not_reset_saved_data(self):
        self.request("/api/vote", self.body())
        original = self.store.path.read_bytes()
        bad = copy.deepcopy(self.raw)
        bad["questions"][0]["cards"] = []
        with self.assertRaises(DecisionError):
            prepare_board(bad, self.root, self.store.directory / "media")
        self.assertEqual(self.store.path.read_bytes(), original)
        self.store.path.write_text('{"schemaVersion":1}')
        corrupt = self.store.path.read_bytes()
        self.assertEqual(self.request("/api/board")[0], 500)
        self.assertEqual(self.store.path.read_bytes(), corrupt)

    def start_study(self):
        (self.root / "concept.png").write_bytes(b"isolated-concept-fixture")
        question = self.raw["questions"][0]
        question["mode"] = "multiple"
        question["study"] = {
            "componentId": "combat-field", "phase": "explore",
            "brief": {"goal": "Readable battlefield", "fixed": ["Graphic novel"],
                      "vary": ["Shadow masses", "Material detail"]},
        }
        template = copy.deepcopy(question["cards"][0])
        template["image"] = "concept.png"
        template["generation"] = {
            "generator": "fixture", "prompt": "Exact generated concept prompt",
            "parameters": {"transparent_background": False}, "references": ["concept.png"],
        }
        question["cards"] = [{**copy.deepcopy(template), "id": f"concept-{index}"} for index in range(10)]
        self.import_raw()

    def feedback_body(self):
        board = self.store.snapshot()
        question = board["questions"][0]
        return {
            "boardId": board["boardId"], "questionId": question["id"],
            "revision": question["revision"], "selected": board["votes"][question["id"]],
            "notes": "Use the first camera and second material, simplify the HUD.",
            "nextCount": 3, "requestId": str(uuid.uuid4()),
        }

    def final_round(self, feedback_id):
        question = copy.deepcopy(self.raw["questions"][0])
        question["id"] = "combat-final"
        question["mode"] = "single"
        question["study"]["phase"] = "final"
        question["study"]["parentFeedbackId"] = feedback_id
        question["cards"] = question["cards"][:3]
        return question

    def test_ten_to_three_to_master_with_exact_recipe_and_restart(self):
        self.start_study()
        self.request("/api/vote", self.body("concept-0"))
        self.request("/api/vote", self.body("concept-1"))
        self.assertEqual(self.request("/api/masters")[1]["masters"], {})
        feedback = self.feedback_body()
        first = self.request("/api/feedback", feedback)
        self.assertEqual(first[0], 200)
        self.assertEqual(self.request("/api/feedback", feedback), first)
        final = self.final_round(first[1]["eventId"])
        self.raw["questions"] = [final]
        self.import_raw()
        vote = {**self.body("concept-2"), "questionId": "combat-final", "revision": 1}
        self.assertEqual(self.request("/api/vote", vote)[0], 200)
        master = self.request("/api/masters")[1]["masters"]["combat-field"]
        self.assertEqual(master["card"]["id"], "concept-2")
        self.assertEqual(master["card"]["generation"]["prompt"], "Exact generated concept prompt")
        self.assertEqual(master["card"]["generation"]["parameters"], {"transparent_background": False})
        self.assertTrue(Path(master["card"]["generation"]["references"][0]).is_file())
        exported = self.request("/api/decisions")[1]
        self.assertEqual(exported["feedback"]["direction"]["selected"], ["concept-0", "concept-1"])
        self.assertEqual(len(exported["feedback"]["direction"]["selectedImages"]), 2)
        self.assertTrue(all(Path(image).is_file() for image in exported["feedback"]["direction"]["selectedImages"]))
        self.assertEqual(master["parentFeedbackId"], first[1]["eventId"])
        self.stop_server()
        self.store = Store(self.store.directory)
        self.start_server()
        self.assertEqual(self.request("/api/masters")[1]["masters"]["combat-field"], master)
        # A draft edit preserves the exact previously approved recipe.
        final["cards"][2]["generation"]["prompt"] = "New draft prompt"
        self.import_raw()
        self.assertEqual(self.request("/api/masters")[1]["masters"]["combat-field"], master)
        self.assertEqual(self.request("/api/vote", vote)[0], 200)
        self.assertEqual(self.request("/api/masters")[1]["masters"]["combat-field"], master)
        vote.update(revision=2, requestId=str(uuid.uuid4()))
        self.assertEqual(self.request("/api/vote", vote)[0], 200)
        self.assertEqual(self.request("/api/masters")[1]["masters"]["combat-field"]["card"]["generation"]["prompt"], "New draft prompt")
        vote.update(liked=False, requestId=str(uuid.uuid4()))
        self.request("/api/vote", vote)
        self.assertEqual(self.request("/api/masters")[1]["masters"], {})

    def test_feedback_rejects_changed_selection_and_preserves_original_brief(self):
        self.start_study()
        self.request("/api/vote", self.body("concept-0"))
        feedback = self.feedback_body()
        self.request("/api/vote", self.body("concept-1"))
        original = self.store.path.read_bytes()
        self.assertEqual(self.request("/api/feedback", feedback)[0], 409)
        self.assertEqual(self.store.path.read_bytes(), original)
        feedback = self.feedback_body()
        self.assertEqual(self.request("/api/feedback", feedback)[0], 200)
        feedback["notes"] = "Conflicting retry"
        self.assertEqual(self.request("/api/feedback", feedback)[0], 409)
        self.raw["questions"][0]["study"]["brief"]["goal"] = "Updated goal"
        self.import_raw()
        saved = self.request("/api/decisions")[1]["feedback"]["direction"]
        self.assertEqual(saved["question"]["study"]["brief"]["goal"], "Readable battlefield")
        self.assertEqual(saved["selected"], ["concept-0", "concept-1"])

    def test_final_import_requires_real_parent_correct_count_and_recipe(self):
        self.start_study()
        self.request("/api/vote", self.body("concept-0"))
        feedback = self.feedback_body()
        self.request("/api/feedback", feedback)
        final = self.final_round(feedback["requestId"])
        self.raw["questions"] = [final]
        original = self.store.path.read_bytes()
        final["study"]["parentFeedbackId"] = "nonexistent"
        with self.assertRaises(DecisionError):
            self.import_raw()
        final["study"]["parentFeedbackId"] = feedback["requestId"]
        final["cards"].pop()
        with self.assertRaises(DecisionError):
            self.import_raw()
        del final["cards"][0]["generation"]
        with self.assertRaises(DecisionError):
            self.import_raw()
        self.assertEqual(self.store.path.read_bytes(), original)

    def test_prompt_keeps_exact_whitespace(self):
        self.start_study()
        prompt = "\n  Exact prompt with intentional spacing.  \n"
        self.raw["questions"][0]["cards"][0]["generation"]["prompt"] = prompt
        imported = self.import_raw()
        self.assertEqual(imported["questions"][0]["cards"][0]["generation"]["prompt"], prompt)

    def test_noop_on_older_final_does_not_replace_current_master(self):
        self.start_study()
        self.request("/api/vote", self.body("concept-0"))
        feedback = self.feedback_body()
        self.request("/api/feedback", feedback)
        first = self.final_round(feedback["requestId"])
        second = copy.deepcopy(first)
        second["id"] = "combat-final-new"
        self.raw["questions"] = [first, second]
        self.import_raw()
        first_vote = {**self.body("concept-0"), "questionId": first["id"], "revision": 1}
        self.request("/api/vote", first_vote)
        second_vote = {**self.body("concept-1"), "questionId": second["id"], "revision": 1}
        self.request("/api/vote", second_vote)
        current = self.request("/api/masters")[1]
        history_length = len(self.store.snapshot()["history"])
        for card_id, liked in (("concept-2", False), ("concept-0", True)):
            noop = {**first_vote, "cardId": card_id, "liked": liked, "requestId": str(uuid.uuid4())}
            response = self.request("/api/vote", noop)
            self.assertEqual(response[0], 200)
            self.assertEqual(self.request("/api/masters")[1], current)
            self.assertEqual(len(self.store.snapshot()["history"]), history_length)
            self.assertEqual(self.request("/api/vote", noop), response)

    def test_all_refinement_requests_remain_visible_with_child_status(self):
        self.start_study()
        self.request("/api/vote", self.body("concept-0"))
        first = self.feedback_body()
        self.request("/api/feedback", first)
        second = self.feedback_body()
        second["notes"] = "Different refinement to keep separately"
        self.request("/api/feedback", second)
        status, exported = self.request("/api/requests")
        self.assertEqual(status, 200)
        requests = {request["id"]: request for request in exported["requests"]}
        self.assertEqual(set(requests), {first["requestId"], second["requestId"]})
        self.assertTrue(all(request["status"] == "pending" for request in requests.values()))
        final = self.final_round(first["requestId"])
        self.raw["questions"] = [final]
        self.import_raw()
        requests = {request["id"]: request for request in self.request("/api/requests")[1]["requests"]}
        self.assertEqual(requests[first["requestId"]]["status"], "completed")
        self.assertEqual(requests[first["requestId"]]["children"][0]["questionId"], final["id"])
        self.assertEqual(requests[second["requestId"]]["status"], "pending")
        self.assertTrue(all(Path(image).is_file() for image in requests[first["requestId"]]["selectedImages"]))

    def test_revoke_survives_draft_edits_and_old_retry_preserves_new_approval(self):
        self.start_study()
        self.request("/api/vote", self.body("concept-0"))
        feedback = self.feedback_body()
        self.request("/api/feedback", feedback)
        final = self.final_round(feedback["requestId"])
        self.raw["questions"] = [final]
        self.import_raw()
        vote = {**self.body("concept-0"), "questionId": final["id"], "revision": 1}
        self.request("/api/vote", vote)
        master = self.request("/api/masters")[1]["masters"]["combat-field"]
        final["cards"][0]["generation"]["prompt"] = "New draft"
        self.import_raw()
        revoke = {
            "boardId": vote["boardId"], "componentId": "combat-field",
            "approvalId": master["approvalId"], "requestId": str(uuid.uuid4()),
        }
        receipt = self.request("/api/revoke", revoke)
        self.assertEqual(receipt[0], 200)
        self.assertEqual(self.request("/api/masters")[1]["masters"], {})

        self.assertEqual(self.request("/api/revoke", revoke), receipt)
        vote.update(revision=2, requestId=str(uuid.uuid4()))
        self.request("/api/vote", vote)
        current = self.request("/api/masters")[1]
        self.assertEqual(self.request("/api/revoke", revoke), receipt)
        self.assertEqual(self.request("/api/masters")[1], current)
        stale_revoke = {**revoke, "requestId": str(uuid.uuid4())}
        original = self.store.path.read_bytes()
        self.assertEqual(self.request("/api/revoke", stale_revoke)[0], 409)
        self.assertEqual(self.store.path.read_bytes(), original)
        latest_revoke = {**stale_revoke, "approvalId": current["masters"]["combat-field"]["approvalId"]}
        self.assertEqual(self.request("/api/revoke", latest_revoke)[0], 200)
        self.assertEqual(self.store.snapshot()["votes"][final["id"]], [])
        self.stop_server()
        self.store = Store(self.store.directory)
        self.start_server()
        self.assertEqual(self.request("/api/masters")[1]["masters"], {})


    def document_body(self, **values):
        return {"boardId": self.store.snapshot()["boardId"], "componentId": "combat-field",
                "requestId": str(uuid.uuid4()), "createdBy": "test-agent", **values}

    def saved_brief(self):
        return {
            "title": "Combat interface", "request": "Help choose the combat interface",
            "goal": "Readable commands", "output": "Desktop frame", "status": "ready",
            "fixed": ["Graphic novel"], "vary": ["Command arrangement"],
            "requirements": ["Show action costs"], "openQuestions": [],
            "answers": [{"question": "Which viewport?", "answer": "Desktop 1440x960"}],
        }

    def accept_master(self):
        self.start_study()
        self.request("/api/vote", self.body("concept-0"))
        feedback = self.feedback_body()
        self.request("/api/feedback", feedback)
        final = self.final_round(feedback["requestId"])
        self.raw["questions"] = [final]
        self.import_raw()
        vote = {**self.body("concept-1"), "questionId": final["id"], "revision": 1}
        self.request("/api/vote", vote)
        return self.store.snapshot()["masters"]["combat-field"]

    def artifact_body(self, master, expected=0):
        return self.document_body(approvalId=master["approvalId"], expectedRevision=expected, artifact={
            "title": "Accepted combat HUD", "summary": "Implement the selected arrangement.",
            "requirements": ["Show action costs"], "acceptance": ["Costs are visible before acting"],
            "openQuestions": [], "generation": {
                "generator": "coding-agent", "prompt": "\n  Build the accepted HUD.\n```example```\n",
                "parameters": {},
            },
        })

    def review_body(self, master, revision=1):
        return self.document_body(approvalId=master["approvalId"], revision=revision, review={
            "summary": "Compared the specification and prompt to the selected fixture and brief.",
            "checks": [{"criterion": "Action costs", "result": "pass",
                        "evidence": "Both the requirement and working prompt refer to the selected HUD."}],
            "issues": [],
        })

    def test_interview_is_saved_before_images_and_stale_updates_are_rejected(self):
        body = self.document_body(expectedRevision=0, brief=self.saved_brief())
        first = self.request("/api/brief", body)
        self.assertEqual(first[0], 200)
        self.assertEqual(self.request("/api/brief", body), first)
        saved = self.request("/api/briefs")[1]["briefs"]["combat-field"]
        self.assertEqual(saved["brief"]["answers"][0]["answer"], "Desktop 1440x960")
        original = self.store.path.read_bytes()
        stale = {**body, "requestId": str(uuid.uuid4())}
        self.assertEqual(self.request("/api/brief", stale)[0], 409)
        self.assertEqual(self.store.path.read_bytes(), original)
        self.stop_server()
        self.store = Store(self.store.directory)
        self.start_server()
        self.assertEqual(self.request("/api/briefs")[1]["briefs"]["combat-field"], saved)
        self.assertEqual(self.request("/api/decisions")[1]["boardId"], body["boardId"])
        self.assertEqual(self.request("/api/project")[1]["briefs"]["combat-field"], saved)

    def test_working_prompt_is_created_after_choice_and_reviews_bind_to_revision(self):
        master = self.accept_master()
        self.assertEqual(master["status"], "awaiting_prompt")
        draft = self.artifact_body(master)
        self.assertEqual(self.request("/api/artifact", draft)[0], 200)
        pending = self.store.snapshot()["masters"]["combat-field"]
        self.assertEqual(pending["status"], "awaiting_review")
        self.assertEqual(pending["card"]["generation"]["prompt"], "Exact generated concept prompt")
        report = self.review_body(master)
        empty_report = copy.deepcopy(report)
        empty_report["requestId"] = str(uuid.uuid4())
        empty_report["review"]["checks"] = []
        original = self.store.path.read_bytes()
        self.assertEqual(self.request("/api/review", empty_report)[0], 400)
        self.assertEqual(self.store.path.read_bytes(), original)
        receipt = self.request("/api/review", report)
        self.assertEqual(receipt[0], 200)
        self.assertEqual(self.store.snapshot()["masters"]["combat-field"]["status"], "verified")
        draft2 = self.artifact_body(master, expected=1)
        draft2["artifact"]["generation"]["prompt"] = "Updated working prompt"
        self.assertEqual(self.request("/api/artifact", draft2)[0], 200)
        self.assertEqual(self.store.snapshot()["masters"]["combat-field"]["status"], "awaiting_review")
        original = self.store.path.read_bytes()
        self.assertEqual(self.request("/api/review", {**report, "requestId": str(uuid.uuid4())})[0], 409)
        self.assertEqual(self.store.path.read_bytes(), original)
        self.assertEqual(self.request("/api/review", report), receipt)
        self.assertEqual(self.store.snapshot()["masters"]["combat-field"]["status"], "awaiting_review")
        report2 = self.review_body(master, revision=2)
        report2["review"]["checks"][0]["result"] = "fail"
        report2["review"]["status"] = "verified"
        report2["review"]["issues"] = ["The costs requirement needs clearer wording"]
        self.assertEqual(self.request("/api/review", report2)[0], 200)
        self.assertEqual(self.store.snapshot()["masters"]["combat-field"]["status"], "needs_changes")

    def test_unapproved_or_changed_decision_cannot_receive_a_working_prompt(self):
        master = self.accept_master()
        draft = self.artifact_body(master)
        revoke = self.document_body(approvalId=master["approvalId"])
        self.request("/api/revoke", revoke)
        original = self.store.path.read_bytes()
        self.assertEqual(self.request("/api/artifact", draft)[0], 409)
        self.assertEqual(self.store.path.read_bytes(), original)

    def test_package_contains_specification_prompts_reviews_and_portable_media(self):
        brief = self.document_body(expectedRevision=0, brief=self.saved_brief())
        self.request("/api/brief", brief)
        master = self.accept_master()
        draft = self.artifact_body(master)
        self.request("/api/artifact", draft)
        self.request("/api/review", self.review_body(master))
        with urlopen(self.url + "/api/export.zip", timeout=5) as response:
            self.assertEqual(response.status, 200)
            content = response.read()
        with ZipFile(BytesIO(content)) as archive:
            snapshot = json.loads(archive.read("project.json"))
            self.assertNotIn("receipts", snapshot)
            self.assertEqual(snapshot["masters"]["combat-field"]["status"], "verified")
            decision = json.loads(archive.read("decisions/combat-field.json"))
            self.assertEqual(decision["document"]["artifact"]["generation"]["prompt"], draft["artifact"]["generation"]["prompt"])
            markdown = archive.read("specification.md").decode()
            self.assertIn("Desktop 1440x960", markdown)
            self.assertIn("```example```", markdown)
            self.assertIn("````", markdown)
            self.assertIn("Costs are visible before acting", markdown)
            for question in snapshot["questions"]:
                for card in question["cards"]:
                    self.assertIn(card["image"], archive.namelist())
                    self.assertTrue(all(reference in archive.namelist() for reference in card["generation"]["references"]))
            prompt = json.loads(archive.read("prompts/combat-final/r1/concept-1.json"))
            self.assertEqual(prompt["prompt"], "Exact generated concept prompt")

    def test_agent_work_moves_from_saved_brief_to_reviewed_specification(self):
        brief = self.saved_brief()
        brief["counts"] = {"explore": 2, "refine": 2}
        self.request("/api/brief", self.document_body(expectedRevision=0, brief=brief))
        action = self.request("/api/work")[1]["actions"][0]
        self.assertEqual(action["action"], "generate_exploration")
        self.assertEqual(action["count"], 2)
        self.start_study()
        study = self.raw["questions"][0]["study"]
        study["briefRevision"] = 1
        study["brief"] = self.store.snapshot()["briefs"]["combat-field"]["brief"]
        with self.assertRaises(DecisionError):
            self.import_raw()
        self.raw["questions"][0]["cards"] = self.raw["questions"][0]["cards"][:2]
        self.import_raw()
        self.request("/api/vote", self.body("concept-0"))
        feedback = self.feedback_body()
        feedback["nextCount"] = 2
        self.request("/api/feedback", feedback)
        actions = self.request("/api/work")[1]["actions"]
        self.assertEqual([action["action"] for action in actions], ["generate_refinement"])
        final = self.final_round(feedback["requestId"])
        self.raw["questions"] = [final]
        self.import_raw()
        self.request("/api/vote", {**self.body("concept-1"), "questionId": final["id"], "revision": 1})
        master = self.store.snapshot()["masters"]["combat-field"]
        self.assertEqual(self.request("/api/work")[1]["actions"][0]["action"], "write_specification")
        self.request("/api/artifact", self.artifact_body(master))
        self.assertEqual(self.request("/api/work")[1]["actions"][0]["action"], "review_specification")
        self.request("/api/review", self.review_body(master))
        self.assertEqual(self.request("/api/work")[1]["actions"], [])

    def test_refinement_can_start_from_likes_without_a_written_comment(self):
        self.start_study()
        self.request("/api/vote", self.body("concept-0"))
        self.request("/api/vote", self.body("concept-1"))
        body = self.feedback_body()
        del body["notes"]
        first = self.request("/api/feedback", body)
        self.assertEqual(first[0], 200)
        self.assertEqual(self.request("/api/feedback", body), first)
        request = self.request("/api/requests")[1]["requests"][0]
        self.assertEqual(request["notes"], "")
        self.assertEqual(request["selected"], ["concept-0", "concept-1"])
        self.assertEqual(self.request("/api/work")[1]["actions"][0]["action"], "generate_refinement")


if __name__ == "__main__":
    unittest.main(verbosity=2)
