# i-PESO Assistant — Mobile Hand-off

**For:** the React Native developer
**Status of the backend:** done, deployed, and tested. Nothing on the server needs changing.
**Your job:** build the chat screen. That's it.

---

## 1. What already exists

The whole "brain" is finished and lives in Laravel. The API decides which database
lookups to run, calls Gemini, and returns finished text.

**You do not need — and must not add — a Gemini API key in the mobile app.** The key
lives only in the server's `.env`. If a key ever appears in the RN codebase, that's a bug:
anyone can extract strings from a shipped APK.

Your app sends a question. It gets back a sentence. That is the entire integration.

---

## 2. The API contract

### Endpoint

```
POST {API_BASE_URL}/chat/public
```

No authentication. No token header. This is the guest assistant — it only reads public
data (citizen's charter, job vacancies, job fairs, government programs).

### Request

```json
{
  "message": "May trabaho po ba para sa welder?",
  "history": [
    { "role": "user",  "text": "Paano po mag-register?" },
    { "role": "model", "text": "Para makapag-register po kayo..." }
  ]
}
```

| Field | Rules |
|---|---|
| `message` | Required. String. **Max 500 characters** — enforce this in the `TextInput` with `maxLength={500}`. |
| `history` | Optional. Array, **max 12 entries**, oldest first. Send only the previous turns — do **not** include the new message, the server appends it. |
| `history[].role` | Must be exactly `"user"` or `"model"`. Not `"assistant"`, not `"bot"`. |
| `history[].text` | Max 2000 characters each. |

The server is **stateless** — it remembers nothing between calls. Whatever context you
want the assistant to have, you resend every time. Keep the last 12 turns in component
state and send them.

### Success response — `200`

```json
{ "reply": "Sa kasalukuyan po, wala kaming nakikitang bakanteng posisyon para sa welder..." }
```

Render `reply` as plain text. It may contain real newlines — do not strip them.

### Error responses — `429` and `503`

```json
{ "reply": "Marami pong gumagamit ngayon. Pakisubukan ulit sa ilang sandali.", "retryable": true }
```

**Important:** error responses still contain a `reply` field that is already written for
the user, in Tagalog. Display it as a normal assistant bubble. Do **not** show a raw error
or a stack trace.

- `429` — rate limit hit. `retryable: true`. This will happen: the Gemini free tier is
  quota-limited and the route is capped at **10 requests per minute per IP**.
- `503` — upstream failure or misconfiguration. `retryable: false`.

### The one integration bug to avoid

Do not send the new message inside `history` as well as in `message`. The server appends
`message` itself, so doing both makes the assistant see the question twice and reply oddly.

---

## 3. What to build

A dedicated **screen**, not a floating corner bubble.

The web version uses a floating widget because a desktop browser has room to spare. On a
phone it fights the tab bar and the OS gesture area. Add an `assistant` route to the
seeker tab navigator (or a header icon that pushes the screen), matching how the existing
Jobs and Job Fairs screens work.

Required behaviour:

- Scrolling message list, newest at the bottom, auto-scroll on new message
- Text input pinned to the bottom with a send button
- Typing indicator while the request is in flight
- Input disabled while a request is pending, so nobody can double-send
- Four tappable starter chips shown when the conversation is empty (copy in §5)
- A one-line disclaimer under the input (copy in §5)

---

## 4. React Native gotchas

**Keyboard handling is where the time goes.** A bottom-pinned input plus an opening
keyboard is the classic RN chat problem, and it behaves differently per platform. Expect
this to need tuning:

```jsx
<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  keyboardVerticalOffset={headerHeight + tabBarHeight}
>
```

Get real values for `headerHeight` and `tabBarHeight` from
`@react-navigation/elements` (`useHeaderHeight`) and
`useBottomTabBarHeight` — hardcoded numbers break on notched devices.

**Do not attempt streaming.** `fetch` streaming support in RN is limited. The endpoint is
non-streaming by design; a typing indicator reads just as well.

**Handle flaky connections.** Set an explicit timeout on the request (15–20s) and always
resolve to a message the user can read. Never leave the UI stuck on a spinner.

**Use `FlatList`, not `ScrollView`**, for the message log, and call `scrollToEnd` in
`onContentSizeChange`.

---

## 5. Copy (use verbatim)

Keep this identical to the web version so both surfaces sound like one service.

**Greeting** (shown before the first message):
> Kumusta po! Ako ang i-PESO assistant ng Urdaneta City PESO. Maaari po kayong magtanong tungkol sa registration, trabaho, job fairs, at government programs.

**Starter chips:**
> - Paano po mag-register?
> - May trabaho po ba para sa welder?
> - Kailan po ang susunod na job fair?
> - Libre po ba ang i-PESO?

**Disclaimer under the input:**
> Sagot batay sa impormasyon ng PESO. Huwag pong maglagay ng personal na impormasyon dito.

**Input placeholder:** `Magtanong po kayo…`

---

## 6. Reference service module

Adapt this to whatever HTTP client the codebase already uses. Do not create a second
axios instance if one exists — reuse it so base URL and timeouts stay in one place.

```js
// services/chatbotService.js
import apiClient from './api'

const MAX_HISTORY_TURNS = 12

export async function askAssistant(message, history = []) {
  try {
    const { data } = await apiClient.post('/chat/public', {
      message,
      history: history.slice(-MAX_HISTORY_TURNS),
    })
    return { reply: data.reply, retryable: false }
  } catch (error) {
    const reply = error.response?.data?.reply
    if (reply) {
      return { reply, retryable: Boolean(error.response?.data?.retryable) }
    }
    return {
      reply:
        'Hindi po ako maka-connect ngayon. Pakicheck po ang inyong internet at subukan ulit.',
      retryable: true,
    }
  }
}
```

Message state shape — keep it identical to the wire format so no mapping is needed:

```js
const [messages, setMessages] = useState([]) // [{ role: 'user' | 'model', text: string }]
```

---

## 7. Rules you must not break

1. **No API key in the app.** Ever. The server holds it.
2. **Do not add tools or endpoints that read personal data.** This assistant is
   deliberately scoped to public information so that nothing covered by the Data Privacy
   Act (RA 10173) is sent to Google. Application status, profiles, and documents are out
   of scope by design, not by oversight.
3. **Do not tell users to type personal details into the chat.** The disclaimer says the
   opposite; keep it.
4. **Do not invent fallback answers in the app.** If the API says it does not know, show
   that. A hardcoded client-side FAQ will drift out of sync with the database and
   contradict the server.

---

## 8. Test checklist

- [ ] Tagalog question returns a Tagalog answer
- [ ] English question returns an English answer
- [ ] Taglish question returns Taglish
- [ ] Starter chips send on tap and then disappear
- [ ] Keyboard does not cover the input on both iOS and Android
- [ ] Keyboard does not cover the input on a notched device
- [ ] Send button is disabled while a reply is pending
- [ ] Send button is disabled when the input is empty
- [ ] Airplane mode shows a readable message, not a crash or infinite spinner
- [ ] Sending 11 messages inside a minute shows the friendly 429 text
- [ ] Long replies wrap and scroll correctly
- [ ] Conversation survives rotating the device
- [ ] Nothing in the codebase contains a Gemini key (`grep -ri "AIza" .`)

---

## 9. Questions

The API contract in §2 is fixed and already live — you can build against it immediately
without waiting on anything. If you need a field the endpoint does not return, ask before
working around it in the client; it is almost always a one-line change on the server.
