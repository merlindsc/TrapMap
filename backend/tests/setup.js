// ============================================
// TEST SETUP & UTILITIES
// Supabase Mocks & Helper Functions
// ============================================

// Set JWT secret for tests
process.env.JWT_SECRET = 'test-secret-key-for-testing';

// Mock Supabase Client
jest.mock('@supabase/supabase-js', () => {
  const mockSupabase = {
    from: jest.fn(() => mockSupabase),
    select: jest.fn(() => mockSupabase),
    insert: jest.fn(() => mockSupabase),
    update: jest.fn(() => mockSupabase),
    delete: jest.fn(() => mockSupabase),
    eq: jest.fn(() => mockSupabase),
    neq: jest.fn(() => mockSupabase),
    in: jest.fn(() => mockSupabase),
    gte: jest.fn(() => mockSupabase),
    lte: jest.fn(() => mockSupabase),
    like: jest.fn(() => mockSupabase),
    ilike: jest.fn(() => mockSupabase),
    order: jest.fn(() => mockSupabase),
    limit: jest.fn(() => mockSupabase),
    single: jest.fn(() => mockSupabase),
    maybeSingle: jest.fn(() => mockSupabase),
    range: jest.fn(() => mockSupabase),
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn()
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        download: jest.fn(),
        remove: jest.fn(),
        getPublicUrl: jest.fn()
      }))
    }
  };

  return {
    createClient: jest.fn(() => mockSupabase)
  };
});

// ============================================
// TEST UTILITIES
// ============================================

/**
 * Create a mock user object
 */
const createMockUser = (overrides = {}) => {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'technician',
    organisation_id: 'test-org-id',
    first_name: 'Test',
    last_name: 'User',
    ...overrides
  };
};

/**
 * Create a mock box object
 */
const createMockBox = (overrides = {}) => {
  return {
    id: 'test-box-id',
    qr_code: 'TEST-QR-123',
    number: 1,
    object_id: 'test-object-id',
    organisation_id: 'test-org-id',
    status: 'active',
    box_type_id: 'test-type-id',
    lat: null,
    lng: null,
    placement: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  };
};

/**
 * Create a mock Express request object
 */
const createMockRequest = (overrides = {}) => {
  return {
    body: {},
    params: {},
    query: {},
    user: createMockUser(),
    headers: {
      authorization: 'Bearer test-token'
    },
    ...overrides
  };
};

/**
 * Create a mock Express response object
 */
const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

// ============================================
// CLEANUP
// ============================================

afterEach(() => {
  jest.clearAllMocks();
});

// ============================================
// EXPORTS
// ============================================

module.exports = {
  createMockUser,
  createMockBox,
  createMockRequest,
  createMockResponse
};
