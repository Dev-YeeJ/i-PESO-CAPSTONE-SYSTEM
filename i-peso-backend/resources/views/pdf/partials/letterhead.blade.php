{{--
  Formal City of Urdaneta / PESO letterhead shared by the official PDF reports
  (placement report, job fair attendance, …). Self-contained inline styles so a
  template can @include it without copying CSS. dompdf-safe: tables only.
--}}
<table style="width:100%;border-collapse:collapse">
  <tr>
    <td style="width:80px;vertical-align:middle;padding:0">
      {{-- The city seal artwork carries wide white margins, so it is drawn larger
           (and pulled in) to read the same size as the PESO seal beside it. --}}
      <img src="{{ public_path('images/urdaneta-city-seal.jpg') }}" alt="City of Urdaneta seal"
           style="width:86px;height:86px;margin:-12px 0 -12px -8px">
    </td>
    <td style="text-align:center;vertical-align:middle;padding:0">
      <div style="font-size:8.4px;color:#334155;letter-spacing:.2px">Republic of the Philippines</div>
      <div style="font-size:8.4px;color:#334155;letter-spacing:.2px">Province of Pangasinan</div>
      <div style="font-family:'DejaVu Serif',serif;font-size:12px;font-weight:bold;letter-spacing:1px;color:#123563;margin-top:1px">CITY OF URDANETA</div>
      <div style="font-family:'DejaVu Serif',serif;font-size:10.5px;font-weight:bold;letter-spacing:.6px;color:#0f172a">PUBLIC EMPLOYMENT SERVICE OFFICE</div>
      <div style="font-size:7.4px;color:#64748b;margin-top:2px">i-PESO Integrated Employment Portal &middot; ipeso.website</div>
    </td>
    <td style="width:80px;text-align:right;vertical-align:middle;padding:0">
      <img src="{{ public_path('images/peso-urdaneta-seal.jpg') }}" alt="PESO Urdaneta seal" style="width:60px;height:60px">
    </td>
  </tr>
</table>
<div style="border-top:2.4px solid #123563;margin-top:4px"></div>
<div style="border-top:.8px solid #F59E0B;margin-top:1.5px"></div>
