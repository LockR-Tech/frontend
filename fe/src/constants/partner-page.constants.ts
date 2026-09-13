// ============================================
// Partner Page Constants
// ============================================

export const PARTNER_DASHBOARD = {
  TITLE: "partner.dashboard.title",
  SUBTITLE: "partner.dashboard.subtitle",

  OVERVIEW_CARDS: {
    TODAY_ORDERS: "partner.dashboard.cards.todayOrders",
    PROCESSING_ORDERS: "partner.dashboard.cards.processingOrders",
    MONTHLY_REVENUE: "partner.dashboard.cards.monthlyRevenue",
    ACTIVE_LOCKERS: "partner.dashboard.cards.activeLockers",
  },

  ALERTS: {
    PENDING_COLLECTIONS: "partner.dashboard.alerts.pendingCollections",
    OVERDUE_ORDERS: "partner.dashboard.alerts.overdueOrders",
  },

  CHARTS: {
    REVENUE_TREND: "partner.dashboard.charts.revenueTrend",
    ORDER_STATUS: "partner.dashboard.charts.orderStatus",
    TOP_SERVICES: "partner.dashboard.charts.topServices",
  },
} as const;

export const PARTNER_ORDERS = {
  TITLE: "partner.orders.title",

  TABS: {
    ALL: "partner.orders.tabs.all",
    WAITING: "partner.orders.tabs.waiting",
    COLLECTED: "partner.orders.tabs.collected",
    PROCESSING: "partner.orders.tabs.processing",
    RETURNED: "partner.orders.tabs.returned",
    COMPLETED: "partner.orders.tabs.completed",
  },

  ACTIONS: {
    COLLECT: "partner.orders.actions.collect",
    START_PROCESSING: "partner.orders.actions.startProcessing",
    COMPLETE_PROCESSING: "partner.orders.actions.completeProcessing",
    RETURN_TO_LOCKER: "partner.orders.actions.returnToLocker",
    DELIVER_HOME: "partner.orders.actions.deliverHome",
    VIEW_DETAILS: "partner.orders.actions.viewDetails",
  },

  FILTERS: {
    SERVICE_TYPE: "partner.orders.filters.serviceType",
    DATE_RANGE: "partner.orders.filters.dateRange",
    STAFF_ASSIGNED: "partner.orders.filters.staffAssigned",
  },
} as const;

export const PARTNER_STAFF = {
  TITLE: "partner.staff.title",
  ADD_STAFF: "partner.staff.addStaff",

  ROLES: {
    LAUNDRY_ATTENDANT: "partner.staff.roles.laundryAttendant",
    DELIVERY_DRIVER: "partner.staff.roles.deliveryDriver",
    MANAGER: "partner.staff.roles.manager",
  },

  PERFORMANCE: {
    COMPLETED_ORDERS: "partner.staff.performance.completedOrders",
    AVG_PROCESSING_TIME: "partner.staff.performance.avgProcessingTime",
    RATING: "partner.staff.performance.rating",
    ON_TIME_RATE: "partner.staff.performance.onTimeRate",
  },
} as const;

export const PARTNER_REVENUE = {
  TITLE: "partner.revenue.title",

  SUMMARY: {
    TOTAL_REVENUE: "partner.revenue.summary.totalRevenue",
    PLATFORM_FEE: "partner.revenue.summary.platformFee",
    NET_REVENUE: "partner.revenue.summary.netRevenue",
    PAID_AMOUNT: "partner.revenue.summary.paidAmount",
    PENDING_AMOUNT: "partner.revenue.summary.pendingAmount",
  },

  PAYMENT_HISTORY: "partner.revenue.paymentHistory",
  EXPORT_REPORT: "partner.revenue.exportReport",
} as const;

export const PARTNER_LOCKERS = {
  TITLE: "partner.lockers.title",

  STATUS: {
    ACTIVE: "partner.lockers.status.active",
    MAINTENANCE: "partner.lockers.status.maintenance",
    INACTIVE: "partner.lockers.status.inactive",
  },

  BOX_STATUS: {
    AVAILABLE: "partner.lockers.boxStatus.available",
    OCCUPIED: "partner.lockers.boxStatus.occupied",
    RESERVED: "partner.lockers.boxStatus.reserved",
    MAINTENANCE: "partner.lockers.boxStatus.maintenance",
  },

  ACTIONS: {
    VIEW_DETAILS: "partner.lockers.actions.viewDetails",
    REPORT_ISSUE: "partner.lockers.actions.reportIssue",
  },
} as const;

export const PARTNER_SERVICES = {
  TITLE: "partner.services.title",
  ADD_SERVICE: "partner.services.addService",

  FIELDS: {
    NAME: "partner.services.fields.name",
    BASE_PRICE: "partner.services.fields.basePrice",
    PRICE_PER_KG: "partner.services.fields.pricePerKg",
    PROCESSING_TIME: "partner.services.fields.processingTime",
    DESCRIPTION: "partner.services.fields.description",
  },
} as const;

export const PARTNER_PROFILE = {
  TITLE: "partner.profile.title",
  SUBTITLE: "partner.profile.subtitle",

  SECTIONS: {
    BUSINESS_INFO: "partner.profile.sections.businessInfo",
    ADDRESS: "partner.profile.sections.address",
    BANK_INFO: "partner.profile.sections.bankInfo",
    WORKING_HOURS: "partner.profile.sections.workingHours",
  },

  FIELDS: {
    BUSINESS_NAME: "partner.profile.fields.businessName",
    CONTACT_PERSON: "partner.profile.fields.contactPerson",
    EMAIL: "partner.profile.fields.email",
    PHONE: "partner.profile.fields.phone",
    TAX_CODE: "partner.profile.fields.taxCode",
    DESCRIPTION: "partner.profile.fields.description",
    BANK_NAME: "partner.profile.fields.bankName",
    BANK_ACCOUNT: "partner.profile.fields.bankAccount",
    BANK_ACCOUNT_NAME: "partner.profile.fields.bankAccountName",
  },

  ACTIONS: {
    SAVE: "partner.profile.actions.save",
    CANCEL: "partner.profile.actions.cancel",
    UPLOAD_AVATAR: "partner.profile.actions.uploadAvatar",
  },
} as const;

export const ORDER_STATUS_COLORS = {
  RESERVED: "bg-blue-100 text-blue-700",
  INITIALIZED: "bg-cyan-100 text-cyan-700",
  WAITING: "bg-yellow-100 text-yellow-700",
  COLLECTED: "bg-purple-100 text-purple-700",
  PROCESSING: "bg-orange-100 text-orange-700",
  RETURNED: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELED: "bg-red-100 text-red-700",
} as const;

export const PLATFORM_FEE_PERCENTAGE = 20;
