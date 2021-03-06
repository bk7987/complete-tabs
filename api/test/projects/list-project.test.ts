import { Application } from 'express';
import { Project } from '../../src/domain/project/project.entity';
import { headers, initialize, makeClient, TestClient } from '../helpers';

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

const createProject = async (project: Partial<Project> = testProject) => {
  const res = await client.post(project, `/projects`, headers.default);
  return res.body as Project;
};

it('can list projects that belong to the user', async () => {
  await createProject(testProject);
  await createProject({ ...testProject, projectNumber: 'other-project-number' });
  let res = await client.get(`/projects`, headers.default);
  expect(res.body.data).toHaveLength(2);
  expect(res.status).toBe(200);

  res = await client.get(`/projects`, headers.default);
  expect(res.body.data).toHaveLength(2);
  expect(res.status).toBe(200);
});

it('returns an empty list if no projects exist', async () => {
  const res = await client.get(`/projects`, headers.default);
  expect(res.body.data).toHaveLength(0);
  expect(res.status).toBe(200);
});

it('does not list projects from other users', async () => {
  let res = await client.post(testProject, `/projects`, headers.otherUser());
  expect(res.status).toBe(201);

  res = await client.get('/projects', headers.default);
  expect(res.body.data).toHaveLength(0);
});

// it('correctly paginates responses', async () => {
//   for (let i = 0; i < 300; i++) {
//     await createProject({ ...testProject, projectNumber: `Project ${i.toString()}` });
//   }

//   const res = await client.get('/projects?page=1', defaultHeaders);
//   console.log(res.body);
//   expect(res.body.data).toHaveLength(200);
//   expect(res.body.metadata).toStrictEqual({
//     object: 'metadata',
//     count: 200,
//     self: '',
//     next: '',
//   });
//   expect(res.status).toBe(200);
// });
