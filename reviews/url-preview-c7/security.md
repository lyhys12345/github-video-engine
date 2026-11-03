# Candidate 7 / security — PASS, affected-scope recheck

Manifest SHA-256 `274c43e69592159e7e271dcc471155c46319e7189df8b11942c8f444bfda3d62`; all 628 hashes/lengths matched. Current engine hash `c1c985d497bb140aab35ba2163f601952ed8c2d2b0d25cbc5aec02246636e0c8`. Unchanged AGENTS/security/common rules and contract. Windows/Node 24.22.1, 2026-11-03. No other judge or builder report read; candidate/shared source unchanged, only independent scratch files and approved local tools. No target execution, paid service or external write.

## Changed implementation and safety conclusion

Only `src/workflow/final-delivery.ts` changes runtime behavior: SHA-256 changes from C6 `362e371c33c5b4c6fbae09088297fce81257edfb4ca2648c9764da9e5c562cba` to C7 `4d462b6fb16aa3b708ee0daef31cbad031967314c9399754d6f8ff6028e81fe2`. The other three source-tree changes are tests.

The old existing-target helper conflated an initially absent root with missing files in an already existing delivery. The new helper returns false only for the initial root ENOENT, then separately verifies a present root is a regular nonlinked directory, has exact expected manifest bytes and every manifest file's hash/length. Missing files in that present tree still raise FINAL_EXPORT_CONFLICT. Later pre-rename and rename-conflict checks still require a matching complete delivery before treating another writer's output as cached.

No path construction, source-root selection, file allowlist, content binding, overwrite operation or cleanup authority was added by this delta. Existing relative-path/ancestor/link checks, exclusive staged writes and conflict preservation remain. The change does not turn “it appeared after ENOENT” into ownership permission.

## Independent affected tests and additional adversarial observations

`independent-affected-tests.log`: **16 tests / 2 files passed**, exit 0. Final-delivery tests use explicit MOCK provider/media/approval bytes but real filesystem/CAS/SQLite and source closure; they test existing edited files, incomplete directories, corrupt assets, mismatched bindings, missing source closure, destination/source junctions, simultaneous identical writers, and the exact repaired missing-root race. The changed animation test now holds an actual live child and proves SIGKILL; this test repair adds no production permissions.

Own `judge-missing-race.ts` tests four neighboring adversarial outcomes at the precise newly changed observation. The fs hook lets the root lstat report ENOENT after a competing action has created the target. Candidate code is unchanged:

| Competing target appearing after ENOENT | Current result | Preserved data / writes |
| --- | --- | --- |
| Unrelated directory with `user.txt` | FINAL_EXPORT_CONFLICT: incomplete delivery | Sentinel bytes retained; no temporary delivery stages remain. |
| Unrelated regular file | FINAL_EXPORT_CONFLICT: target not directory | File bytes retained. |
| Junction to owned outside directory | FINAL_EXPORT_CONFLICT: target not regular directory | Outside sentinel unchanged; no delivered files written through link. |
| Complete prior directory with user-edited manifest | FINAL_EXPORT_CONFLICT: different manifest | Edited manifest retained; existing output not replaced. |

All four passed, exit 0. Raw `missing-race.log`, `missing-race-results.json` and owned fixture tree remain. The production changed-file hash remained exact. This confirms the repaired successful competing writer case did not weaken neighboring user-file preservation cases.

## Retained C6 security evidence and limits

C6 manifest `a4c4534fcd6849064cfdf4dbdf920e6422664ae64f19d69ecf6868fe675e8c1b`; own C6 reports/probes remain at `C:/Users/luyuh/Documents/Codex/gve-c6-fix/judge-facts-c6`. Exact unchanged implementations justify retaining its 23-test source/preview checks, seven own receipt probes and original FSEC-1/FSEC-2 rechecks. They were not rerun wholesale or counted as newly executed C7 tests. Current engine fingerprint/task/receipt closures were freshly verified because the global source hash changed.

Preview `receipt-v1` still avoids directory rename, reconstructs expected receipt bytes from verified committed artifacts, refuses replacement of occupied receipt paths, checks closure, rejects ambiguous valid versions and preserves failed versions. It is neither signed nor immutable; keep the returned digest through a trusted channel and verify digest/closure at use. Later local writes remain possible. Legacy-v2 and older asset-export's legacy default retain their documented rename race. None of those implementations changed in C7.

This final-delivery fix concerns **cooperating local exports into operator-controlled directories**. It does not retrofit final-delivery with receipt-v1 or provide atomic protection from a malicious process that can replace staging directories between checks. Its preexisting path-based cleanup/publication behavior is not upgraded into a hostile-local-writer guarantee by this PASS. Windows privileged file-symlink tests remain unverified from prior scope; directory junction rejection was freshly exercised here.

No new or affected-scope blocker/major found. No multi-user authorization, codec sandbox, arbitrary local attacker isolation, publication approval or final human acceptance is claimed. Full prior reports and restrictions remain intact.
