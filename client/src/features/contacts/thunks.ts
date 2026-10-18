import { contactsApi } from '@/api/contacts'
import { callApi, createAppAsyncThunk } from '@/app/createAppAsyncThunk'
import type { BulkTagInput, ListQuery, UpdateContactInput } from '@/types/api'

export const fetchContacts = createAppAsyncThunk('contacts/fetchList', (query: ListQuery, { signal, rejectWithValue }) =>
  callApi(() => contactsApi.list(query, signal), rejectWithValue),
)

export const fetchContact = createAppAsyncThunk('contacts/fetchOne', (id: string, { signal, rejectWithValue }) =>
  callApi(() => contactsApi.get(id, signal), rejectWithValue),
)

export const saveContact = createAppAsyncThunk(
  'contacts/save',
  ({ id, input }: { id: string; input: UpdateContactInput }, { rejectWithValue }) =>
    callApi(() => contactsApi.update(id, input), rejectWithValue),
)

export const addTag = createAppAsyncThunk('contacts/addTag', ({ id, tag }: { id: string; tag: string }, { rejectWithValue }) =>
  callApi(() => contactsApi.addTag(id, tag), rejectWithValue),
)

export const removeTag = createAppAsyncThunk('contacts/removeTag', ({ id, tag }: { id: string; tag: string }, { rejectWithValue }) =>
  callApi(() => contactsApi.removeTag(id, tag), rejectWithValue),
)

export const bulkTag = createAppAsyncThunk('contacts/bulkTag', (input: BulkTagInput, { rejectWithValue }) =>
  callApi(() => contactsApi.bulkTag(input), rejectWithValue),
)
