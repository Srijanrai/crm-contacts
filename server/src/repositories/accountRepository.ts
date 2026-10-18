import { Account } from '../models/Account.js'

export const accountRepository = {
  exists: async (id: string): Promise<boolean> => (await Account.exists({ _id: id })) !== null,
}
