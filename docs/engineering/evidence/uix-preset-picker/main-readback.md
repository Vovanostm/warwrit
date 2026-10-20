# PR243 actual-main readback — 2026-10-20

PR243 merged as `3c934c164838dcef492d070c57c017fff10141f8`; issue228 CLOSED.
Reviewed head188d5c00 and actual main have identical trees. Corrected PR
CI39370786684 and main CI39371853005 SUCCESS. Initial CI39369463852 failed
on the test importing server source; correction38c57915 was independently
accepted and does not change production.

Parent used the clean detached actual-main picker checkout and private browser
`picker-parent-main`: reload editor, select deserter-band, explicit load, normal
start (six allies/five opponents), normal end-turn, reload. Accepted action
request5549a9f4-6623-4a27-be9d-44338931f54b advanced session
3f0d67d6-213b-4a2c-a3b1-0ff624b80eae from revision0 to3. Subsequent169 full
GET projections were identical, matched the receipt session/revision, retained
all11 named fighters, and displayed no alerts. Browser closed successfully.
Source evidence: `.orca/uix-preset-picker/main-shots/main-verified.txt`,
`main-reloaded.png`, and neighboring main-* receipts/captures. Parent inspected
the screenshot. Services remain owned by parent; no other service was stopped.

Limits: initial observer matched action-route traffic but missed root creation
POST, so its postsBeforeLaunch=0 is not proof about all POSTs. Initial sameView=false
compared an ACK with a full projection incorrectly; corrected full-GET comparison
is above. These are probe limitations, not reproduced game defects. No new full
battle/terminal run by parent; earlier independent accepted journeys apply to
unchanged production. Existing HUD overlap is visible; whole-scene acceptance
is excluded and overview227 remains in review. No deployment performed.
