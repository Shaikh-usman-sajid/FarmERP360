import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor - attach JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken })
          localStorage.setItem('access_token', res.data.access_token)
          error.config.headers.Authorization = `Bearer ${res.data.access_token}`
          return api.request(error.config)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      } else {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

// ─── API FUNCTIONS ───────────────────────────────────

export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  refresh: (refresh_token: string) => api.post('/auth/refresh', { refresh_token }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (data: object) => api.post('/auth/change-password', data),
}

export const usersAPI = {
  list: (params?: object) => api.get('/users', { params }),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: object) => api.post('/users', data),
  update: (id: string, data: object) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
}

export const animalsAPI = {
  list: (params?: object) => api.get('/animals', { params }),
  get: (id: string) => api.get(`/animals/${id}`),
  create: (data: object) => api.post('/animals', data),
  update: (id: string, data: object) => api.put(`/animals/${id}`, data),
  delete: (id: string) => api.delete(`/animals/${id}`),
  getPhotos: (id: string) => api.get(`/animals/${id}/photos`),
  uploadPhoto: (id: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/animals/${id}/photos`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  deletePhoto: (photoId: string) => api.delete(`/animals/photos/${photoId}`),
  getWeights: (id: string) => api.get(`/animals/${id}/weights`),
  addWeight: (id: string, data: object) => api.post(`/animals/${id}/weights`, data),
}

export const healthAPI = {
  listVaccinations: (params?: object) => api.get('/vaccinations', { params }),
  createVaccination: (data: object) => api.post('/vaccinations', data),
  updateVaccination: (id: string, data: object) => api.put(`/vaccinations/${id}`, data),
  deleteVaccination: (id: string) => api.delete(`/vaccinations/${id}`),
  listTreatments: (params?: object) => api.get('/treatments', { params }),
  createTreatment: (data: object) => api.post('/treatments', data),
  updateTreatment: (id: string, data: object) => api.put(`/treatments/${id}`, data),
  deleteTreatment: (id: string) => api.delete(`/treatments/${id}`),
  listBreeding: (params?: object) => api.get('/breeding-records', { params }),
  createBreeding: (data: object) => api.post('/breeding-records', data),
}

export const dairyAPI = {
  listMilk: (params?: object) => api.get('/milk-productions', { params }),
  createMilk: (data: object) => api.post('/milk-productions', data),
  updateMilk: (id: string, data: object) => api.put(`/milk-productions/${id}`, data),
  deleteMilk: (id: string) => api.delete(`/milk-productions/${id}`),
  dailySummary: (days?: number) => api.get('/milk-productions/summary/daily', { params: { days } }),
  listSales: (params?: object) => api.get('/milk-sales', { params }),
  createSale: (data: object) => api.post('/milk-sales', data),
}

export const inventoryAPI = {
  listProducts: (params?: object) => api.get('/products', { params }),
  getProduct: (id: string) => api.get(`/products/${id}`),
  createProduct: (data: object) => api.post('/products', data),
  updateProduct: (id: string, data: object) => api.put(`/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/products/${id}`),
  listTransactions: (params?: object) => api.get('/inventory-transactions', { params }),
  createTransaction: (data: object) => api.post('/inventory-transactions', data),
}

export const agricultureAPI = {
  listFields: (params?: object) => api.get('/fields', { params }),
  createField: (data: object) => api.post('/fields', data),
  updateField: (id: string, data: object) => api.put(`/fields/${id}`, data),
  listCrops: (params?: object) => api.get('/crop-cycles', { params }),
  createCrop: (data: object) => api.post('/crop-cycles', data),
  listHarvests: () => api.get('/harvests'),
  recordHarvest: (data: object) => api.post('/harvests', data),
}

export const employeesAPI = {
  list: (params?: object) => api.get('/employees', { params }),
  get: (id: string) => api.get(`/employees/${id}`),
  create: (data: object) => api.post('/employees', data),
  update: (id: string, data: object) => api.put(`/employees/${id}`, data),
  listAttendance: (params?: object) => api.get('/attendance', { params }),
  markAttendance: (data: object) => api.post('/attendance', data),
}

export const investorsAPI = {
  // Investors CRUD
  list: () => api.get('/investors'),
  get: (id: string) => api.get(`/investors/${id}`),
  create: (data: object) => api.post('/investors', data),
  update: (id: string, data: object) => api.put(`/investors/${id}`, data),
  // Capital
  addCapital: (data: object) => api.post('/investors/capital', data),
  getCapital: (id: string) => api.get(`/investors/${id}/capital`),
  // Distributions
  listDistributions: (params?: object) => api.get('/investors/distributions', { params }),
  createDistribution: (data: object) => api.post('/investors/distributions', data),
  getInvestorDistributions: (id: string) => api.get(`/investors/${id}/distributions`),
  // Portfolio
  getPortfolio: (id: string) => api.get(`/investors/${id}/portfolio`),
  // Reports
  getSummary: () => api.get('/investors/reports/summary'),
  // Portal (investor role only)
  portalMe: () => api.get('/investors/portal/me'),
  portalPortfolio: () => api.get('/investors/portal/portfolio'),
  portalDistributions: () => api.get('/investors/portal/distributions'),
  portalCapital: () => api.get('/investors/portal/capital'),
}

export const pallaiAPI = {
  // Customers
  listCustomers: () => api.get('/pallai-customers'),
  getCustomer: (id: string) => api.get(`/pallai-customers/${id}`),
  createCustomer: (data: object) => api.post('/pallai-customers', data),
  updateCustomer: (id: string, data: object) => api.put(`/pallai-customers/${id}`, data),
  getCustomerSubscriptions: (id: string) => api.get(`/pallai-customers/${id}/subscriptions`),
  getCustomerLedger: (id: string) => api.get(`/pallai-customers/${id}/ledger`),
  // Packages
  listPackages: () => api.get('/pallai-packages'),
  createPackage: (data: object) => api.post('/pallai-packages', data),
  // Subscriptions
  listSubscriptions: (params?: object) => api.get('/pallai-subscriptions', { params }),
  getSubscription: (id: string) => api.get(`/pallai-subscriptions/${id}`),
  createSubscription: (data: object) => api.post('/pallai-subscriptions', data),
  updateSubscription: (id: string, data: object) => api.put(`/pallai-subscriptions/${id}`, data),
  // Billing
  generateBilling: (data: object) => api.post('/pallai/billing/generate', data),
  // Portal (pallai_customer role)
  portalMe: () => api.get('/pallai/portal/me'),
  portalSubscriptions: () => api.get('/pallai/portal/subscriptions'),
  portalInvoices: () => api.get('/pallai/portal/invoices'),
  portalAnimals: () => api.get('/pallai/portal/animals'),
  // Reports
  reportSummary: () => api.get('/pallai/reports/summary'),
  reportRevenue: (months?: number) => api.get('/pallai/reports/revenue', { params: { months } }),
}

export const invoicesAPI = {
  list: (params?: object) => api.get('/invoices', { params }),
  get: (id: string) => api.get(`/invoices/${id}`),
  create: (data: object) => api.post('/invoices', data),
  update: (id: string, data: object) => api.put(`/invoices/${id}`, data),
}

export const paymentsAPI = {
  list: (params?: object) => api.get('/payments', { params }),
  create: (data: object) => api.post('/payments', data),
}

export const accountingAPI = {
  // Chart of Accounts
  getAccounts: (params?: object) => api.get('/accounting/accounts', { params }),
  createAccount: (data: object) => api.post('/accounting/accounts', data),
  updateAccount: (id: string, data: object) => api.put(`/accounting/accounts/${id}`, data),

  // Journal Entries
  getJournalEntries: (params?: object) => api.get('/accounting/journal-entries', { params }),
  getJournalEntry: (id: string) => api.get(`/accounting/journal-entries/${id}`),
  createJournalEntry: (data: object) => api.post('/accounting/journal-entries', data),
  postJournalEntry: (id: string) => api.post(`/accounting/journal-entries/${id}/post`),
  voidJournalEntry: (id: string) => api.post(`/accounting/journal-entries/${id}/void`),

  // General Ledger
  getGeneralLedger: (accountId: string, params?: object) => api.get(`/accounting/general-ledger/${accountId}`, { params }),

  // Trial Balance
  getTrialBalance: (asOf?: string) => api.get('/accounting/trial-balance', { params: asOf ? { as_of: asOf } : {} }),

  // Vendors
  getVendors: (params?: object) => api.get('/accounting/vendors', { params }),
  createVendor: (data: object) => api.post('/accounting/vendors', data),
  updateVendor: (id: string, data: object) => api.put(`/accounting/vendors/${id}`, data),

  // Vendor Bills
  getBills: (params?: object) => api.get('/accounting/bills', { params }),
  createBill: (data: object) => api.post('/accounting/bills', data),
  payBill: (id: string, amount: number) => api.put(`/accounting/bills/${id}/pay`, null, { params: { amount } }),

  // Payroll
  getPayrollRuns: (params?: object) => api.get('/accounting/payroll', { params }),
  processPayroll: (data: object) => api.post('/accounting/payroll', data),
  getPayrollRun: (id: string) => api.get(`/accounting/payroll/${id}`),

  // Cost Centers
  getCostCenters: () => api.get('/accounting/cost-centers'),
  createCostCenter: (data: object) => api.post('/accounting/cost-centers', data),

  // Reports
  getProfitLoss: (dateFrom: string, dateTo: string) => api.get('/accounting/reports/profit-loss', { params: { date_from: dateFrom, date_to: dateTo } }),
  getBalanceSheet: (asOf: string) => api.get('/accounting/reports/balance-sheet', { params: { as_of: asOf } }),
  getAccountsReceivable: () => api.get('/accounting/reports/accounts-receivable'),
  getAccountsPayable: () => api.get('/accounting/reports/accounts-payable'),
  getCashFlow: (dateFrom: string, dateTo: string) => api.get('/accounting/reports/cash-flow', { params: { date_from: dateFrom, date_to: dateTo } }),
}

export const tasksAPI = {
  list: (params?: object) => api.get('/tasks', { params }),
  myTasks: (params?: object) => api.get('/tasks/my-tasks', { params }),
  summary: () => api.get('/tasks/summary'),
  get: (id: string) => api.get(`/tasks/${id}`),
  create: (data: object) => api.post('/tasks', data),
  update: (id: string, data: object) => api.put(`/tasks/${id}`, data),
  start: (id: string) => api.post(`/tasks/${id}/start`),
  complete: (id: string, data?: object) => api.post(`/tasks/${id}/complete`, data || {}),
  cancel: (id: string) => api.post(`/tasks/${id}/cancel`),
}

export const feedAPI = {
  listTypes: (params?: object) => api.get('/feed-types', { params }),
  createType: (data: object) => api.post('/feed-types', data),
  updateType: (id: string, data: object) => api.put(`/feed-types/${id}`, data),
  deleteType: (id: string) => api.delete(`/feed-types/${id}`),
  listStock: (params?: object) => api.get('/feed-stock', { params }),
  addStock: (data: object) => api.post('/feed-stock', data),
  listConsumption: (params?: object) => api.get('/feed-consumption', { params }),
  addConsumption: (data: object) => api.post('/feed-consumption', data),
  deleteConsumption: (id: string) => api.delete(`/feed-consumption/${id}`),
  summary: () => api.get('/feed/summary'),
}

export const forecastingAPI = {
  feed: (months?: number) => api.get('/forecasting/feed', { params: { months } }),
  cashFlow: (months?: number, milkPrice?: number) => api.get('/forecasting/cash-flow', { params: { months, milk_price_per_liter: milkPrice } }),
  cropYield: () => api.get('/forecasting/crop-yield'),
}

export const adminAPI = {
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data: Record<string, string>) => api.put('/admin/settings', data),
  getAuditLogs: (params?: object) => api.get('/admin/audit-logs', { params }),
  previewAlerts: () => api.get('/admin/notifications/alerts/preview'),
  sendAlerts: (data: object) => api.post('/admin/notifications/alerts/send', data),
  testWhatsapp: (data: { to: string; message?: string }) => api.post('/admin/notifications/whatsapp/test', data),
  getPaymentOptions: (invoiceId: string) => api.get(`/admin/payments/invoice/${invoiceId}`),
  getAnimalQrCode: (animalId: string, baseUrl?: string) =>
    api.get(`/animals/${animalId}/qrcode`, { params: { base_url: baseUrl }, responseType: 'blob' }),
}

export const analyticsAPI = {
  overview: () => api.get('/analytics/overview'),
  milkTrends: (months?: number) => api.get('/analytics/milk-trends', { params: { months } }),
  animalProfitability: () => api.get('/analytics/animal-profitability'),
  cashFlow: (months?: number) => api.get('/analytics/cash-flow', { params: { months } }),
  farmHealth: (months?: number) => api.get('/analytics/farm-health', { params: { months } }),
  inventoryHealth: () => api.get('/analytics/inventory-health'),
  investorPerformance: () => api.get('/analytics/investor-performance'),
  pallaiPerformance: () => api.get('/analytics/pallai-performance'),
}

export const dashboardAPI = {
  owner: () => api.get('/dashboard/owner'),
  farm: () => api.get('/dashboard/farm'),
  accounting: () => api.get('/dashboard/accounting'),
  investor: () => api.get('/dashboard/investor'),
  notifications: () => api.get('/notifications'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  animalReport: () => api.get('/reports/animals'),
  milkReport: (params?: object) => api.get('/reports/milk', { params }),
}
