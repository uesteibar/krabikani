import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

/**
 * Integration tests for the GitHub Actions CI workflow
 * These tests verify the workflow configuration matches the requirements in the PRD
 */

describe('IT-001: Workflow YAML validation and trigger configuration', () => {
  const workflowPath = path.resolve(
    __dirname,
    '../../.github/workflows/ci.yml',
  );
  let workflowContent: string;
  let workflow: any;

  beforeAll(() => {
    workflowContent = fs.readFileSync(workflowPath, 'utf-8');
    workflow = yaml.load(workflowContent);
  });

  it('should parse as valid YAML', () => {
    expect(workflow).toBeDefined();
    expect(typeof workflow).toBe('object');
  });

  it('should trigger on push to main branch', () => {
    expect(workflow.on).toBeDefined();
    expect(workflow.on.push).toBeDefined();
    expect(workflow.on.push.branches).toContain('main');
  });

  it('should trigger on pull requests', () => {
    expect(workflow.on.pull_request).toBeDefined();
  });

  it('should have a quality-checks job', () => {
    expect(workflow.jobs).toBeDefined();
    expect(workflow.jobs['quality-checks']).toBeDefined();
  });

  it('should have a build-apk job', () => {
    expect(workflow.jobs['build-apk']).toBeDefined();
  });

  it('should have build-apk depend on quality-checks', () => {
    expect(workflow.jobs['build-apk'].needs).toBe('quality-checks');
  });

  it('should only run build-apk on push to main', () => {
    const buildJob = workflow.jobs['build-apk'];
    expect(buildJob.if).toContain('push');
    expect(buildJob.if).toContain('main');
  });
});

describe('IT-004: Release job configuration for latest tag', () => {
  const workflowPath = path.resolve(
    __dirname,
    '../../.github/workflows/ci.yml',
  );
  let workflow: any;

  beforeAll(() => {
    const workflowContent = fs.readFileSync(workflowPath, 'utf-8');
    workflow = yaml.load(workflowContent);
  });

  it('should have a release job', () => {
    expect(workflow.jobs.release).toBeDefined();
  });

  it('should have release job depend on build-apk job', () => {
    expect(workflow.jobs.release.needs).toBe('build-apk');
  });

  it('should use softprops/action-gh-release action', () => {
    const releaseJob = workflow.jobs.release;
    const releaseSteps = releaseJob.steps;

    const ghReleaseStep = releaseSteps.find(
      (step: any) =>
        step.uses && step.uses.startsWith('softprops/action-gh-release'),
    );

    expect(ghReleaseStep).toBeDefined();
  });

  it('should configure tag_name as latest', () => {
    const releaseJob = workflow.jobs.release;
    const releaseSteps = releaseJob.steps;

    const ghReleaseStep = releaseSteps.find(
      (step: any) =>
        step.uses && step.uses.startsWith('softprops/action-gh-release'),
    );

    expect(ghReleaseStep.with.tag_name).toBe('latest');
  });

  it('should configure files to point to the APK', () => {
    const releaseJob = workflow.jobs.release;
    const releaseSteps = releaseJob.steps;

    const ghReleaseStep = releaseSteps.find(
      (step: any) =>
        step.uses && step.uses.startsWith('softprops/action-gh-release'),
    );

    expect(ghReleaseStep.with.files).toContain('apk');
  });

  it('should delete existing latest release before creating new one', () => {
    const releaseJob = workflow.jobs.release;
    const releaseSteps = releaseJob.steps;

    const deleteStep = releaseSteps.find(
      (step: any) => step.run && step.run.includes('gh release delete latest'),
    );

    expect(deleteStep).toBeDefined();
  });

  it('should set release name with commit SHA', () => {
    const releaseJob = workflow.jobs.release;
    const releaseSteps = releaseJob.steps;

    const ghReleaseStep = releaseSteps.find(
      (step: any) =>
        step.uses && step.uses.startsWith('softprops/action-gh-release'),
    );

    expect(ghReleaseStep.with.name).toContain('Latest Build');
    expect(ghReleaseStep.with.name).toContain('sha');
  });

  it('should include commit link in release body', () => {
    const releaseJob = workflow.jobs.release;
    const releaseSteps = releaseJob.steps;

    const ghReleaseStep = releaseSteps.find(
      (step: any) =>
        step.uses && step.uses.startsWith('softprops/action-gh-release'),
    );

    expect(ghReleaseStep.with.body).toContain('commit');
  });
});

describe('Build configuration validation', () => {
  const workflowPath = path.resolve(
    __dirname,
    '../../.github/workflows/ci.yml',
  );
  let workflow: any;

  beforeAll(() => {
    const workflowContent = fs.readFileSync(workflowPath, 'utf-8');
    workflow = yaml.load(workflowContent);
  });

  it('should build APK with correct ARM architectures', () => {
    const buildJob = workflow.jobs['build-apk'];
    const buildSteps = buildJob.steps;

    const buildStep = buildSteps.find(
      (step: any) => step.run && step.run.includes('assembleRelease'),
    );

    expect(buildStep).toBeDefined();
    expect(buildStep.run).toContain('armeabi-v7a');
    expect(buildStep.run).toContain('arm64-v8a');
  });

  it('should NOT include x86 architectures in build', () => {
    const buildJob = workflow.jobs['build-apk'];
    const buildSteps = buildJob.steps;

    const buildStep = buildSteps.find(
      (step: any) => step.run && step.run.includes('assembleRelease'),
    );

    // The architectures should be explicitly ARM-only
    expect(buildStep.run).toContain(
      '-PreactNativeArchitectures=armeabi-v7a,arm64-v8a',
    );
  });

  it('should upload APK as artifact', () => {
    const buildJob = workflow.jobs['build-apk'];
    const buildSteps = buildJob.steps;

    const uploadStep = buildSteps.find(
      (step: any) =>
        step.uses && step.uses.startsWith('actions/upload-artifact'),
    );

    expect(uploadStep).toBeDefined();
    expect(uploadStep.with.path).toContain('apk');
  });

  it('should use Gradle caching', () => {
    const buildJob = workflow.jobs['build-apk'];
    const buildSteps = buildJob.steps;

    const gradleSetupStep = buildSteps.find(
      (step: any) =>
        step.uses && step.uses.startsWith('gradle/actions/setup-gradle'),
    );

    expect(gradleSetupStep).toBeDefined();
  });

  it('should use Node.js module caching', () => {
    const buildJob = workflow.jobs['build-apk'];
    const buildSteps = buildJob.steps;

    const nodeSetupStep = buildSteps.find(
      (step: any) => step.uses && step.uses.startsWith('actions/setup-node'),
    );

    expect(nodeSetupStep).toBeDefined();
    expect(nodeSetupStep.with.cache).toBe('npm');
  });
});
