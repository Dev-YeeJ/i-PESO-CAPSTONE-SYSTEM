import { IPESO_LOGO_URL } from './brandAssets'

export default function IPesoLogo({ className = '', alt = 'i-PESO logo' }) {
  return (
    <img
      src={IPESO_LOGO_URL}
      alt={alt}
      className={`shrink-0 object-contain ${className}`}
      loading="eager"
      decoding="async"
    />
  )
}
