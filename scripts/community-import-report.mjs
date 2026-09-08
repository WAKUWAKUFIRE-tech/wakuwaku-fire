import path from 'node:path';
import { build } from './community-render.mjs';
import { findLatestSourceReport, importReport } from './community-report.mjs';

const source = process.argv[2] ? path.resolve(process.argv[2]) : findLatestSourceReport();
const result = importReport(source);
if (result.changed) {
  build();
  console.log(`既存週報をサイト用に保存しました: ${result.startDate} ～ ${result.endDate}`);
} else {
  console.log(`同じ週報が公開済みのため変更ありません: ${result.startDate} ～ ${result.endDate}`);
}

