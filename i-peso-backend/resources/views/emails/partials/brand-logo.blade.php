@php
    $logoPath = public_path('i_peso_app_icon_1024.png');
    $logoSource = asset('i_peso_app_icon_1024.png');

    if (isset($message) && is_file($logoPath) && method_exists($message, 'embed')) {
        $logoSource = $message->embed($logoPath);
    }
@endphp

<img
    src="{{ $logoSource }}"
    width="68"
    height="68"
    alt="i-PESO"
    style="display:block;width:68px;height:68px;margin:0 auto;border:0;border-radius:16px;object-fit:contain;background:#ffffff;"
>
