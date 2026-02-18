import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

const WORKFLOW_PATH = path.resolve(
  __dirname,
  '../../.github/workflows/release-apk.yml',
);

describe('release-apk.yml workflow', () => {
  let workflow: any;

  beforeAll(() => {
    const content = fs.readFileSync(WORKFLOW_PATH, 'utf8');
    workflow = YAML.parse(content);
  });

  it('is valid YAML that parses without error', () => {
    expect(workflow).toBeDefined();
    expect(workflow.name).toBe('Release APK');
  });

  it('triggers only on push to main branch', () => {
    expect(workflow.on.push.branches).toEqual(['main']);
    expect(workflow.on.pull_request).toBeUndefined();
  });

  it('sets permissions contents: write', () => {
    expect(workflow.permissions.contents).toBe('write');
  });

  it('defines a concurrency group with cancel-in-progress: true', () => {
    expect(workflow.concurrency).toBeDefined();
    expect(workflow.concurrency.group).toBeDefined();
    expect(workflow.concurrency['cancel-in-progress']).toBe(true);
  });

  it('sets up Node.js 20 with npm cache', () => {
    const steps = workflow.jobs['release-apk'].steps;
    const nodeStep = steps.find(
      (s: any) => s.uses && s.uses.startsWith('actions/setup-node@'),
    );
    expect(nodeStep).toBeDefined();
    expect(nodeStep.with['node-version']).toBe(20);
    expect(nodeStep.with.cache).toBe('npm');
  });

  it('sets up Java 17 Temurin', () => {
    const steps = workflow.jobs['release-apk'].steps;
    const javaStep = steps.find(
      (s: any) => s.uses && s.uses.startsWith('actions/setup-java@'),
    );
    expect(javaStep).toBeDefined();
    expect(javaStep.with['java-version']).toBe(17);
    expect(javaStep.with.distribution).toBe('temurin');
  });

  it('configures Gradle via gradle/actions/setup-gradle@v4', () => {
    const steps = workflow.jobs['release-apk'].steps;
    const gradleStep = steps.find(
      (s: any) => s.uses === 'gradle/actions/setup-gradle@v4',
    );
    expect(gradleStep).toBeDefined();
  });

  it('installs npm dependencies with npm ci', () => {
    const steps = workflow.jobs['release-apk'].steps;
    const npmCiStep = steps.find(
      (s: any) => s.run && s.run.includes('npm ci'),
    );
    expect(npmCiStep).toBeDefined();
  });

  it('generates codegen artifacts before building', () => {
    const steps = workflow.jobs['release-apk'].steps;
    const codegenStep = steps.find(
      (s: any) =>
        s.run && s.run.includes('generateCodegenArtifactsFromSchema'),
    );
    expect(codegenStep).toBeDefined();
    expect(codegenStep['working-directory']).toBe('android');
  });

  it('builds release APK targeting armeabi-v7a and arm64-v8a', () => {
    const steps = workflow.jobs['release-apk'].steps;
    const buildStep = steps.find(
      (s: any) => s.run && s.run.includes('assembleRelease'),
    );
    expect(buildStep).toBeDefined();
    expect(buildStep.run).toContain(
      '-PreactNativeArchitectures=armeabi-v7a,arm64-v8a',
    );
  });

  it('deletes existing latest release with continue-on-error', () => {
    const steps = workflow.jobs['release-apk'].steps;
    const deleteStep = steps.find(
      (s: any) => s.run && s.run.includes('gh release delete latest'),
    );
    expect(deleteStep).toBeDefined();
    expect(deleteStep['continue-on-error']).toBe(true);
  });

  it('creates a GitHub Release tagged latest as a pre-release with APK attached', () => {
    const steps = workflow.jobs['release-apk'].steps;
    const createStep = steps.find(
      (s: any) => s.run && s.run.includes('gh release create latest'),
    );
    expect(createStep).toBeDefined();
    expect(createStep.run).toContain('--prerelease');
    expect(createStep.run).toContain('app-release.apk');
  });

  it('includes commit SHA in the release body', () => {
    const steps = workflow.jobs['release-apk'].steps;
    const createStep = steps.find(
      (s: any) => s.run && s.run.includes('gh release create latest'),
    );
    expect(createStep.run).toContain('github.sha');
  });

  it('builds wear release APK', () => {
    const steps = workflow.jobs['release-apk'].steps;
    const buildSteps = steps.filter(
      (s: any) => s.run && s.run.includes('assembleRelease'),
    );
    const buildsWear = buildSteps.some((s: any) =>
      s.run.includes(':wear:assembleRelease'),
    );
    expect(buildsWear).toBe(true);
  });

  it('attaches wear APK to the GitHub release', () => {
    const steps = workflow.jobs['release-apk'].steps;
    const createStep = steps.find(
      (s: any) => s.run && s.run.includes('gh release create latest'),
    );
    expect(createStep.run).toContain('wear-release.apk');
  });
});
