import { Application } from 'express';
import { Project } from '../../src/domain/project/project.entity';
import { validation } from '../../src/validation';
import {
  apiObjectProps,
  headers,
  initialize,
  makeClient,
  TestClient,
  validationError,
} from '../helpers';

let app: Application;
let client: TestClient;

beforeAll(async () => {
  app = await initialize();
  client = makeClient('/api/v1', headers.default, app);
});

const testProject = {
  name: 'test-project',
  projectNumber: 'test-project-number',
  description: 'This is a test project',
  client: 'test-client',
  active: true,
};

const testEstimate = {
  estimateNumber: '1',
  periodEnding: '2021-01-09',
};

const createProject = async (project: Partial<Project> = testProject) => {
  const res = await client.post(project, '/projects', headers.default);
  return res.body as Project;
};

it('can create an estimate from the projects endpoint', async () => {
  const project = await createProject();
  const res = await client.post(testEstimate, `/projects/${project.id}/estimates`, headers.default);
  expect(res.body).toStrictEqual({
    ...apiObjectProps('estimate'),
    ...testEstimate,
    projectId: expect.any(String),
  });
  expect(res.status).toBe(201);
});

it('can create an estimate from the estimates endpoint', async () => {
  const project = await createProject();
  const res = await client.post(
    { ...testEstimate, projectId: project.id },
    '/estimates',
    headers.default
  );
  expect(res.body).toStrictEqual({
    ...apiObjectProps('estimate'),
    ...testEstimate,
    projectId: expect.any(String),
  });
  expect(res.status).toBe(201);
});

it('cannot create estimates for projects that dont belong to the user', async () => {
  let res = await client.post(testProject, `/projects`, headers.otherUser());
  expect(res.status).toBe(201);

  res = await client.post(
    { ...testEstimate, projectId: res.body.id },
    '/estimates',
    headers.default
  );
  expect(res.status).toBe(404);
});

it('cannot create estimates for projects that do not exist', async () => {
  let res = await client.post(
    { ...testEstimate, projectId: 'does-not-exist' },
    '/estimates',
    headers.default
  );
  expect(res.status).toBe(404);

  res = await client.post(testEstimate, `/projects/does-not-exist/estimates`, headers.default);
  expect(res.status).toBe(404);
});

it('cannot create an estimate with missing properties', async () => {
  const res = await client.post({}, `/estimates`, headers.default);

  expect(res.body.details).toContainEqual(validationError(validation.required('estimateNumber')));
  expect(res.body.details).toContainEqual(validationError(validation.required('periodEnding')));
  expect(res.body.details).toContainEqual(validationError(validation.required('projectId')));
  expect(res.status).toBe(400);
});

it('cannot create an estimate with extra properties', async () => {
  const project = await createProject();
  const res = await client.post(
    { ...testEstimate, test: 'extra' },
    `/projects/${project.id}/estimates`,
    headers.default
  );
  expect(res.body.details).toContainEqual(validationError(validation.extra('test')));
  expect(res.status).toBe(400);
});

it('cannot create two estimates with the same estimateNumber on the same project', async () => {
  const project = await createProject();
  let res = await client.post(
    { ...testEstimate, projectId: project.id },
    '/estimates',
    headers.default
  );
  expect(res.status).toBe(201);
  res = await client.post(
    { ...testEstimate, projectId: project.id },
    '/estimates',
    headers.default
  );
  expect(res.status).toBe(400);
});

it('is able to create two estimates with the same estimateNumber under different projects', async () => {
  const project1 = await createProject();
  const project2 = await createProject({ ...testProject, projectNumber: 'different-number' });

  let res = await client.post(
    { ...testEstimate, projectId: project1.id },
    '/estimates',
    headers.default
  );
  expect(res.status).toBe(201);

  res = await client.post(
    { ...testEstimate, projectId: project2.id },
    '/estimates',
    headers.default
  );
  expect(res.status).toBe(201);
});

it('cannot create an estimate with invalid properties', async () => {
  let res = await client.post({ itemNumber: 3333 }, '/estimates', headers.default);
  expect(res.body.details).toContainEqual(validationError(validation.string('estimateNumber')));
  expect(res.status).toBe(400);

  res = await client.post({ itemNumber: null }, '/estimates', headers.default);
  expect(res.body.details).toContainEqual(validationError(validation.required('estimateNumber')));
  expect(res.status).toBe(400);

  res = await client.post({ periodEnding: '2021-00-01' }, '/estimates', headers.default);
  expect(res.body.details).toContainEqual(validationError(validation.date('periodEnding')));
  expect(res.status).toBe(400);
});
