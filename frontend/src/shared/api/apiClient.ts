type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  token?: string | null
}

type ProblemDetails = {
  title?: string
  detail?: string
  status?: number
}

const translatedDetails: Record<string, string> = {
  'Invalid email or password': 'Неверный email или пароль.',
  'Email is already registered': 'Пользователь с таким email уже зарегистрирован.',
  'Invalid or expired verification code': 'Код недействителен или срок его действия истёк.',
  'Email is already verified': 'Email уже подтверждён.',
  'Wait one minute before requesting another code': 'Подождите минуту перед повторной отправкой кода.',
  'Email service is unavailable; please retry later': 'Почтовый сервис временно недоступен. Попробуйте позже.',
  'Email must be verified': 'Email заявителя ещё не подтверждён.',
  'Only pending applications can be reviewed': 'Эта заявка уже была рассмотрена.',
  'Application not found': 'Заявка не найдена.',
  'The record has changed; reload it before saving': 'Данные уже были изменены. Обновите страницу и повторите попытку.',
  'The request conflicts with existing data': 'Операцию нельзя выполнить из-за связанных данных.',
  'An active invitation already exists for this email': 'Для этого email уже есть активное приглашение.',
  'Only pending invitations can be revoked': 'Можно отозвать только активное приглашение.',
  'Invalid invitation token': 'Ссылка приглашения недействительна.',
  'Invitation has already been used or revoked': 'Приглашение уже принято или отозвано.',
  'Invitation has expired': 'Срок действия приглашения истёк.',
  'An account already exists; sign in to accept the invitation': 'Аккаунт с этим email уже существует. Войдите, чтобы принять приглашение.',
  'Invitation belongs to another email address': 'Приглашение предназначено для другого email.',
  'The group has no players': 'В группе пока нет игроков.',
  'Each player can be marked only once': 'Игрок не может встречаться в ведомости дважды.',
  'Attendance must include every player in the group': 'Обновите ведомость: состав группы изменился.',
  'Attendance cannot be recorded for a future date': 'Нельзя отметить посещаемость на будущую дату.',
  'Attendance has changed; reload it before saving': 'Ведомость уже изменена. Обновите страницу и повторите сохранение.',
  'Player not found': 'Игрок не найден или у вас нет доступа к его данным.',
  'Parent access required': 'Для этого раздела нужна роль родителя.',
  'Assessment has changed; reload it before saving': 'Оценка уже была изменена. Обновите страницу и повторите сохранение.',
  'An assessment already exists for this date': 'Для этого игрока уже есть оценка на выбранную дату.',
  'Assessment cannot be recorded for a future date': 'Нельзя добавить оценку на будущую дату.',
  'Assessment not found': 'Оценка не найдена или у вас нет к ней доступа.',
  'Invalid request content.': 'Проверьте заполнение полей формы.',
  FORBIDDEN: 'У вас недостаточно прав для этого действия.',
}

export class ApiError extends Error {
  readonly status: number
  readonly detail: string

  constructor(
    status: number,
    detail: string,
  ) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, token, headers, ...requestOptions } = options
  const requestHeaders = new Headers(headers)

  if (body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json')
  }
  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`)
  }

  let response: Response
  try {
    response = await fetch(path, {
      ...requestOptions,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Не удалось подключиться к серверу. Проверьте, запущен ли backend.')
  }

  if (response.status === 204) {
    return undefined as T
  }

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? ((await response.json()) as ProblemDetails | T) : await response.text()

  if (!response.ok) {
    const problem = typeof payload === 'object' && payload !== null ? (payload as ProblemDetails) : null
    const detail = problem?.detail || problem?.title || `Сервер вернул ошибку ${response.status}.`
    throw new ApiError(response.status, translatedDetails[detail] || detail)
  }

  return payload as T
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.detail
  }
  return 'Что-то пошло не так. Попробуйте ещё раз.'
}
