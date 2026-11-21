// The app's single toast entry point. Every page imports from here, so the
// toast library (sonner, mounted once in App.jsx) can change in one place.
// API: toast(msg), toast.success/error/warning/info/loading(msg, { id, duration }), toast.dismiss(id)
import { toast } from 'sonner'

export { toast }
export default toast
