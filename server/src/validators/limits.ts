/** Same values as client/src/validation/limits.ts. */
export const LIMITS = {
  firstNameMax: 100,
  lastNameMax: 100,
  emailMax: 254,
  companyMax: 120,
  phoneMinDigits: 7,
  phoneMaxDigits: 15,
  tagNameMax: 30,
  tagsPerContact: 20,
  bulkMaxContacts: 500,
  searchMax: 100,
  tagFilterMax: 10,
  limitMax: 100,
  defaultLimit: 20,
  activityPageSize: 20,
  activityPageMax: 50,
} as const
