import { Application } from 'express';
import { ContractItem } from '../../src/domain/contract-item/contract-item.entity';
import { Project } from '../../src/domain/project/project.entity';
import { validation } from '../../src/validation';
import {
  apiObjectProps,
  createOrganization,
  headers,
  initialize,
  makeClient,
  TestClient,
  validationError,
} from '../helpers';

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

const testContractItem = {
  itemNumber: '9999-9999',
  description: 'test-description',
  quantity: 33.35,
  unit: 'EA',
  unitPrice: 6667,
};

const testTabItem = {
  tabSet: 'test-tab-set',
  quantity: 45.56,
  remarks: 'Test remarks',
  street: 'test street',
  side: 'test side',
  beginStation: 4565,
  endStation: 5469,
};

const createProject = async (project: Partial<Project> = testProject) => {
  const res = await client.post(project, '/projects', defaultHeaders);
  return res.body as Project;
};

const createContractItem = async (
  projectId: string,
  item: Partial<ContractItem> = testContractItem
) => {
  const res = await client.post({ ...item, projectId }, '/contract-items', defaultHeaders);
  return res.body as ContractItem;
};

const createProjectAndContractItem = async () => {
  const project = await createProject();
  const contractItem = await createContractItem(project.id);
  return { project, contractItem };
};

it('can create a tab-item via the contract-items endpoint', async () => {
  const { contractItem } = await createProjectAndContractItem();
  const res = await client.post(
    testTabItem,
    `/contract-items/${contractItem.id}/tab-items`,
    defaultHeaders
  );
  expect(res.body).toStrictEqual({
    ...apiObjectProps('tab-item'),
    ...testTabItem,
    contractItem: expect.any(String),
  });
  expect(res.status).toBe(201);
});

it('can create a tab-item via the tab-items endpoint', async () => {
  const { contractItem } = await createProjectAndContractItem();
  const res = await client.post(
    { ...testTabItem, contractItemId: contractItem.id },
    '/tab-items',
    defaultHeaders
  );
  expect(res.body).toStrictEqual({
    ...apiObjectProps('tab-item'),
    ...testTabItem,
    contractItem: expect.any(String),
  });
  expect(res.status).toBe(201);
});

it('cannot create tab-items for a contract-item that the users organization does not own', async () => {
  const otherOrg = await createOrganization(client);
  const otherHeaders = headers.userWithOrg(otherOrg.id, 'other-user');
  let res = await client.post(testProject, `/organizations/${otherOrg.id}/projects`, otherHeaders);
  expect(res.status).toBe(201);
  const otherProject = res.body;

  res = await client.post(
    testContractItem,
    `/projects/${otherProject.id}/contract-items`,
    otherHeaders
  );
  expect(res.status).toBe(201);

  res = await client.post(
    { ...testTabItem, contractItemId: res.body.id },
    '/tab-items',
    otherHeaders
  );
  expect(res.status).toBe(201);

  res = await client.post(
    { ...testTabItem, contractItemId: res.body.id },
    '/tab-items',
    defaultHeaders
  );
  expect(res.status).toBe(404);
});

it('cannot create tab-items for contract-items that do not exist', async () => {
  const res = await client.post(
    { ...testTabItem, contractItemId: 'does-not-exist' },
    '/tab-items',
    defaultHeaders
  );
  expect(res.status).toBe(404);
});

it('cannot create a tab-item with missing properties', async () => {
  let res = await client.post({}, '/tab-items', defaultHeaders);
  expect(res.body.details).toContainEqual(validationError(validation.required('contractItemId')));
  expect(res.body.details).toContainEqual(validationError(validation.required('quantity')));
  expect(res.status).toBe(400);
});

it('cannot create a tab-item with extra properties', async () => {
  const { contractItem } = await createProjectAndContractItem();
  const res = await client.post(
    {
      ...testTabItem,
      contractItemId: contractItem.id,
      test: 'invalid-prop',
    },
    '/tab-items',
    defaultHeaders
  );
  expect(res.body.details).toContainEqual(validationError(validation.extra('test')));
  expect(res.status).toBe(400);
});

it('cannot create a tab-item with invalid properties', async () => {
  const res = await client.post(
    {
      tabSet: 1,
      quantity: '45',
      remarks: true,
      street: 4,
      side: 56,
      beginStation: 45.67,
      endStation: 23.69,
      contractItemId: 45,
    },
    '/tab-items',
    defaultHeaders
  );
  expect(res.body.details).toContainEqual(validationError(validation.string('tabSet')));
  expect(res.body.details).toContainEqual(validationError(validation.number('quantity')));
  expect(res.body.details).toContainEqual(validationError(validation.string('remarks')));
  expect(res.body.details).toContainEqual(validationError(validation.string('street')));
  expect(res.body.details).toContainEqual(validationError(validation.string('side')));
  expect(res.body.details).toContainEqual(validationError(validation.integer('beginStation')));
  expect(res.body.details).toContainEqual(validationError(validation.integer('endStation')));
  expect(res.body.details).toContainEqual(validationError(validation.string('contractItemId')));
  expect(res.status).toBe(400);
});
