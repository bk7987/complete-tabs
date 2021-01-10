import { Application } from 'express';
import { ContractItem } from '../../src/domain/contract-item/contract-item.entity';
import { Project } from '../../src/domain/project/project.entity';
import { headers, initialize, makeClient, TestClient } from '../helpers';

let app: Application;
let client: TestClient;
let orgId: string;
let defaultHeaders: ReturnType<typeof headers.userWithOrg>;

beforeAll(async () => {
  app = await initialize();
  client = makeClient('/api/v1', headers.default, app);
});

beforeEach(async () => {
  const res = await client.post({ name: 'test-org' }, '/organizations');
  orgId = res.body.id;
  defaultHeaders = headers.userWithOrg(orgId);
});

const testProject = {
  name: 'test-project',
  projectNumber: 'test-project-number',
  description: 'This is a test project',
  client: 'test-client',
  active: true,
};

const testItem = {
  itemNumber: '9999-9999',
  description: 'test-description',
  quantity: 33.35,
  unit: 'EA',
  unitPrice: 6667,
};

const createProject = async (project: Partial<Project> = testProject) => {
  const res = await client.post(project, '/projects', defaultHeaders);
  return res.body as Project;
};

const createItem = async (projectId: string, item: Partial<ContractItem> = testItem) => {
  const res = await client.post({ ...item, projectId }, '/contract-items', defaultHeaders);
  return res.body as ContractItem;
};

it('can delete a contract-item', async () => {
  const project = await createProject();
  const item = await createItem(project.id);

  let res = await client.delete(`/contract-items/${item.id}`, defaultHeaders);
  expect(res.status).toBe(204);
  expect(res.body).toStrictEqual({});

  res = await client.get(`/contract-items/${item.id}`, defaultHeaders);
  expect(res.status).toBe(404);
});

it('cannot delete a contract-item from another organization', async () => {
  // Create other user's organization
  let res = await client.post(
    { name: 'other-org' },
    '/organizations',
    headers.otherUser('other-user')
  );
  const otherOrgId = res.body.id;
  const otherHeader = headers.userWithOrg(otherOrgId, 'other-user');

  res = await client.post(testProject, '/projects', otherHeader);
  expect(res.status).toBe(201);

  res = await client.post({ ...testItem, projectId: res.body.id }, '/contract-items', otherHeader);
  expect(res.status).toBe(201);
  const itemId = res.body.id;

  res = await client.delete(`/contract-items/${itemId}`, defaultHeaders);
  expect(res.status).toBe(404);

  res = await client.get(`/contract-items/${itemId}`, otherHeader);
  expect(res.body.id).toBe(itemId);
  expect(res.status).toBe(200);
});