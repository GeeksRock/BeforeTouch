import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSend = vi.fn()

vi.mock('resend', () => ({
  Resend: function () {
    return { emails: { send: mockSend } }
  },
}))

const { sendEmail } = await import('./email')

describe('sendEmail', () => {
  beforeEach(() => {
    mockSend.mockReset()
  })

  it('sends an email with the correct parameters', async () => {
    mockSend.mockResolvedValue({ data: { id: 'msg-1' }, error: null })

    await sendEmail({ to: 'user@example.com', subject: 'Hello', html: '<p>Hi</p>' })

    expect(mockSend).toHaveBeenCalledWith({
      from: 'BeforeTouch <notifications@beforetouch.com>',
      to: 'user@example.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
    })
  })

  it('throws when the response contains an error', async () => {
    const resendError = { name: 'validation_error', message: 'Invalid email' }
    mockSend.mockResolvedValue({ data: null, error: resendError })

    await expect(
      sendEmail({ to: 'bad', subject: 'Test', html: '<p>x</p>' })
    ).rejects.toEqual(resendError)
  })
})
