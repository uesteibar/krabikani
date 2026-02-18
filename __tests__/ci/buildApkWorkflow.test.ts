import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

const WORKFLOW_PATH = path.resolve(
  __dirname,
  '../../.github/workflows/build-apk.yml',
);

describe('build-apk.yml workflow', () => {
  let workflow: any;

  beforeAll(() => {
    const content = fs.readFileSync(WORKFLOW_PATH, 'utf8');
    workflow = YAML.parse(content);
  });

  it('triggers on pull_request with opened, synchronize, reopened', () => {
    expect(workflow.on.pull_request.types).toEqual([
      'opened',
      'synchronize',
      'reopened',
    ]);
  });

  it('runs on ubuntu-latest', () => {
    const job = workflow.jobs['build-apk'];
    expect(job['runs-on']).toBe('ubuntu-latest');
  });

  it('sets up Node 20 with npm cache', () => {
    const steps = workflow.jobs['build-apk'].steps;
    const nodeStep = steps.find(
      (s: any) => s.uses && s.uses.startsWith('actions/setup-node@'),
    );
    expect(nodeStep).toBeDefined();
    expect(nodeStep.with['node-version']).toBe(20);
    expect(nodeStep.with.cache).toBe('npm');
  });

  it('sets up Java 17 Temurin', () => {
    const steps = workflow.jobs['build-apk'].steps;
    const javaStep = steps.find(
      (s: any) => s.uses && s.uses.startsWith('actions/setup-java@'),
    );
    expect(javaStep).toBeDefined();
    expect(javaStep.with['java-version']).toBe(17);
    expect(javaStep.with.distribution).toBe('temurin');
  });

  it('configures Gradle caching via gradle/actions/setup-gradle@v4', () => {
    const steps = workflow.jobs['build-apk'].steps;
    const gradleStep = steps.find(
      (s: any) => s.uses === 'gradle/actions/setup-gradle@v4',
    );
    expect(gradleStep).toBeDefined();
  });

  it('installs npm dependencies with npm ci', () => {
    const steps = workflow.jobs['build-apk'].steps;
    const npmCiStep = steps.find((s: any) => s.run && s.run.includes('npm ci'));
    expect(npmCiStep).toBeDefined();
  });

  it('runs assembleRelease targeting armeabi-v7a,arm64-v8a', () => {
    const steps = workflow.jobs['build-apk'].steps;
    const buildStep = steps.find(
      (s: any) => s.run && s.run.includes('assembleRelease'),
    );
    expect(buildStep).toBeDefined();
    expect(buildStep.run).toContain(
      '-PreactNativeArchitectures=armeabi-v7a,arm64-v8a',
    );
  });

  it('uploads the APK as a GitHub Actions artifact', () => {
    const steps = workflow.jobs['build-apk'].steps;
    const uploadStep = steps.find(
      (s: any) => s.uses && s.uses.startsWith('actions/upload-artifact@'),
    );
    expect(uploadStep).toBeDefined();
    expect(uploadStep.with.path).toContain('app-release.apk');
  });

  it('upload step has id so its outputs can be referenced', () => {
    const steps = workflow.jobs['build-apk'].steps;
    const uploadStep = steps.find(
      (s: any) => s.uses && s.uses.startsWith('actions/upload-artifact@'),
    );
    expect(uploadStep.id).toBe('upload');
  });

  it('posts or updates a PR comment using actions/github-script', () => {
    const steps = workflow.jobs['build-apk'].steps;
    const commentStep = steps.find(
      (s: any) => s.uses && s.uses.startsWith('actions/github-script@'),
    );
    expect(commentStep).toBeDefined();
    expect(commentStep.with.script).toBeDefined();
  });

  it('passes artifact-url as an environment variable to the comment step', () => {
    const steps = workflow.jobs['build-apk'].steps;
    const commentStep = steps.find(
      (s: any) => s.uses && s.uses.startsWith('actions/github-script@'),
    );
    expect(commentStep.env.ARTIFACT_URL).toBe(
      '${{ steps.upload.outputs.artifact-url }}',
    );
  });

  it('comment script uses process.env.ARTIFACT_URL instead of a manual run URL', () => {
    const steps = workflow.jobs['build-apk'].steps;
    const commentStep = steps.find(
      (s: any) => s.uses && s.uses.startsWith('actions/github-script@'),
    );
    const script = commentStep.with.script;
    expect(script).toContain('process.env.ARTIFACT_URL');
    expect(script).not.toContain('context.runId');
  });

  it('comment body contains download links for both APKs', () => {
    const steps = workflow.jobs['build-apk'].steps;
    const commentStep = steps.find(
      (s: any) => s.uses && s.uses.startsWith('actions/github-script@'),
    );
    const script = commentStep.with.script;
    expect(script).toContain('[Download phone APK]');
    expect(script).toContain('[Download wear APK]');
  });

  it('uses a marker comment for update-in-place behavior', () => {
    const steps = workflow.jobs['build-apk'].steps;
    const commentStep = steps.find(
      (s: any) => s.uses && s.uses.startsWith('actions/github-script@'),
    );
    expect(commentStep.with.script).toContain('<!-- apk-bot -->');
  });

  it('updates existing comment rather than always creating new ones', () => {
    const steps = workflow.jobs['build-apk'].steps;
    const commentStep = steps.find(
      (s: any) => s.uses && s.uses.startsWith('actions/github-script@'),
    );
    const script = commentStep.with.script;
    expect(script).toContain('updateComment');
    expect(script).toContain('createComment');
  });

  it('has pull-requests write permission for commenting', () => {
    const permissions = workflow.permissions;
    expect(permissions['pull-requests']).toBe('write');
  });

  it('builds wear release APK', () => {
    const steps = workflow.jobs['build-apk'].steps;
    const buildSteps = steps.filter(
      (s: any) => s.run && s.run.includes('assembleRelease'),
    );
    const buildsWear = buildSteps.some((s: any) =>
      s.run.includes(':wear:assembleRelease'),
    );
    expect(buildsWear).toBe(true);
  });

  it('uploads wear APK as a GitHub Actions artifact', () => {
    const steps = workflow.jobs['build-apk'].steps;
    const uploadSteps = steps.filter(
      (s: any) => s.uses && s.uses.startsWith('actions/upload-artifact@'),
    );
    const wearUpload = uploadSteps.find(
      (s: any) => s.with.path && s.with.path.includes('wear'),
    );
    expect(wearUpload).toBeDefined();
    expect(wearUpload.with.name).toContain('wear');
  });

  it('PR comment includes wear APK artifact link', () => {
    const steps = workflow.jobs['build-apk'].steps;
    const commentStep = steps.find(
      (s: any) => s.uses && s.uses.startsWith('actions/github-script@'),
    );
    const script = commentStep.with.script;
    expect(script).toContain('WEAR_ARTIFACT_URL');
  });
});
