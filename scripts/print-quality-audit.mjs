// Read one native audit result. The preceding Fallow process owns the gate.
import { readFile } from 'node:fs/promises';

const reportPath = process.argv[2];
const report = JSON.parse(await readFile(reportPath, 'utf8'));

function partition(findings) {
  return {
    introduced: findings.filter((finding) => finding.introduced === true),
    inherited: findings.filter((finding) => finding.introduced === false).length,
    unclassified: findings.filter(
      (finding) => finding.introduced !== true && finding.introduced !== false,
    ),
  };
}

function describeComplexity(finding) {
  const metrics = {
    cyclomatic: finding.cyclomatic,
    cognitive: finding.cognitive,
    crap: finding.crap,
  };
  return `${JSON.stringify(finding.path)}:${finding.line} ${JSON.stringify(finding.name)} [${finding.effective_severity ?? 'unknown'}] ${finding.exceeded} ${JSON.stringify(metrics)}`;
}

function describeClone(group) {
  const locations = group.instances.map(
    (instance) => `${JSON.stringify(instance.file)}:${instance.start_line}-${instance.end_line}`,
  );
  return `${group.fingerprint} ${locations.join(', ')}`;
}

function printFindings(label, findings, describe) {
  console.log(`${label} (${findings.length})`);
  for (const finding of findings) console.log(`- ${describe(finding)}`);
}

if (report.error === true) {
  console.error(`Native audit tool error ${JSON.stringify(report.message)}`);
} else {
  if (report.kind !== 'audit' || report.schema_version !== 11) {
    throw new Error(`Unsupported audit report in ${reportPath}`);
  }
  console.log(`Native audit verdict ${report.verdict}`);
  console.log(`Native gates ${JSON.stringify(report.gate_outcomes)}`);
  console.log(`Native attribution ${JSON.stringify(report.attribution)}`);

  const complexity = partition(report.complexity?.findings ?? []);
  const errors = complexity.introduced.filter((finding) => finding.effective_severity === 'error');
  const other = complexity.introduced.filter((finding) => finding.effective_severity !== 'error');
  printFindings('Introduced complexity errors', errors, describeComplexity);
  printFindings('Other introduced complexity', other, describeComplexity);
  printFindings('Unclassified complexity', complexity.unclassified, describeComplexity);
  console.log(`Inherited complexity retained in JSON (${complexity.inherited})`);

  const clones = partition(report.duplication?.clone_groups ?? []);
  printFindings('Introduced clone groups', clones.introduced, describeClone);
  printFindings('Unclassified clone groups', clones.unclassified, describeClone);
  console.log(`Inherited clone groups retained in JSON (${clones.inherited})`);
  console.log(`Complete native report and remaining categories ${reportPath}`);
}
