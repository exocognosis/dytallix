/**
 * Test Helpers - Mocks
 * Mock utilities for testing
 */

/**
 * Mock Express request
 */
export const mockRequest = (options = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    method: 'GET',
    path: '/',
    ...options,
});

/**
 * Mock Express response
 */
export const mockResponse = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.send = vi.fn().mockReturnValue(res);
    res.setHeader = vi.fn().mockReturnValue(res);
    res.end = vi.fn().mockReturnValue(res);
    return res;
};

/**
 * Mock Express next function
 */
export const mockNext = () => vi.fn();

/**
 * Mock blockchain node response
 */
export const mockBlockchainResponse = (data = {}) => ({
    ok: true,
    json: vi.fn().mockResolvedValue(data),
    status: 200,
});

/**
 * Mock email transporter
 */
export const mockEmailTransporter = () => ({
    sendMail: vi.fn().mockResolvedValue({
        messageId: 'test-message-id',
        accepted: ['test@example.com'],
    }),
});

/**
 * Mock fetch response
 */
export const mockFetch = (data, options = {}) => {
    const response = {
        ok: options.ok !== undefined ? options.ok : true,
        status: options.status || 200,
        json: vi.fn().mockResolvedValue(data),
        text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    };
    return vi.fn().mockResolvedValue(response);
};
