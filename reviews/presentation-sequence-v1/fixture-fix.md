# Windows 深路径测试夹具独立复审

**判定：PASS。** 比较冻结 c3 解包版与深路径复现副本，test-fixture.patch 只改变 tests/presentation.test.ts 的文件系统夹具。原测试的拒绝用例、预期错误码和 Unexpected dispatch 防线保持一致。生产实现、路径预检及其阈值均不在补丁范围。

旧夹具把故意未使用的状态目录放在工作区之下。before.log 显示深路径使测试提前得到 EXPLAIN_STATE_PATH_TOO_LONG，未到达预期的 PRESENTATION_SEQUENCE_DUPLICATE。新版使用系统临时目录中唯一的 gve-seq- 目录。测试结束后只删除已知规格文件，并以非递归 rmdir 删除测试目录。若意外生成状态文件，目录非空会使清理报错，异常副作用不会被递归删除掩盖。

在原有深路径复现副本独立运行 `node node_modules/vitest/vitest.mjs run tests/presentation.test.ts -t 'rejects unbounded or unsupported sequence specs before dispatch'`，1 项通过、10 项按筛选跳过。该复验只验证夹具变更和原拒绝断言。
