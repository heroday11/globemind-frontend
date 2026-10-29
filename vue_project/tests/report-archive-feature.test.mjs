import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const source = path => readFile(new URL(path, import.meta.url), "utf8")

test("report center indexes generated artifacts from every report location", async () => {
  const archive = await source("../src/utils/reportArchive.js")
  assert.match(archive, /fetch\(`\$\{API_PREFIX\}\/assistant\/reports`/)
  assert.match(archive, /downloadPath: file\.download_path/)
  assert.match(archive, /docx\?/)
  assert.match(archive, /pptx\?/)
  assert.match(archive, /export async function downloadReportFile/)
})

test("report cards expose a download action while retaining view and delete", async () => {
  const [center, mine] = await Promise.all([
    source("../src/views/DataService/report-center.vue"),
    source("../src/views/user/MyApplications.vue"),
  ])
  for (const view of [center, mine]) {
    assert.match(view, /downloadReportFile/)
    assert.match(view, /title="下载报告"/)
    assert.match(view, /:disabled="!report\.downloadPath"/)
    assert.match(view, /title="查看报告"/)
    assert.match(view, /title="删除"/)
  }
})
