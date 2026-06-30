<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #334155;
            -webkit-font-smoothing: antialiased;
            line-height: 1.6;
            margin: 0;
            padding: 0;
        }

        .wrapper {
            background-color: #f8fafc;
            padding: 40px 20px;
            width: 100%;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            overflow: hidden;
            border: 1px solid #e2e8f0;
        }

        .header {
            padding: 32px 40px;
            text-align: center;
            border-bottom: 1px solid #f1f5f9;
        }

        .logo {
            font-size: 24px;
            font-weight: 700;
            color: #0284c7;
            text-decoration: none;
            letter-spacing: -0.5px;
        }

        .logo span {
            color: #f59e0b;
        }

        .content {
            padding: 40px;
        }

        h1 {
            color: #0f172a;
            font-size: 24px;
            font-weight: 700;
            margin-top: 0;
            margin-bottom: 16px;
            line-height: 1.3;
        }

        p {
            margin-top: 0;
            margin-bottom: 24px;
            font-size: 16px;
        }

        .button {
            display: inline-block;
            background-color: #0284c7;
            color: #ffffff !important;
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
            padding: 14px 28px;
            border-radius: 8px;
            text-align: center;
            transition: background-color 0.2s;
        }

        .button:hover {
            background-color: #0369a1;
        }

        .footer {
            padding: 32px 40px;
            text-align: center;
            background-color: #f8fafc;
            border-top: 1px solid #f1f5f9;
            color: #64748b;
            font-size: 13px;
        }

        .footer p {
            margin-bottom: 8px;
            font-size: 13px;
        }

        .text-center { text-align: center; }
        .mt-4 { margin-top: 16px; }
        .mb-4 { margin-bottom: 16px; }
        .mt-8 { margin-top: 32px; }
        
        /* Contextual styles to be used inside emails */
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 16px;
        }
        
        .badge-blue { background-color: #e0f2fe; color: #0369a1; }
        .badge-green { background-color: #dcfce7; color: #15803d; }
        .badge-yellow { background-color: #fef3c7; color: #b45309; }
        .badge-red { background-color: #fee2e2; color: #b91c1c; }
        .badge-purple { background-color: #f3e8ff; color: #7e22ce; }

        .card-inner {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
        }

        .card-inner p:last-child {
            margin-bottom: 0;
        }
        
        @media only screen and (max-width: 600px) {
            .container {
                width: 100% !important;
                border-radius: 0 !important;
            }
            .content, .header, .footer {
                padding: 24px 20px !important;
            }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <a href="{{ config('app.frontend_url') }}" class="logo">
                    i-<span>PESO</span>
                </a>
            </div>
            
            <div class="content">
                @yield('content')
            </div>
            
            <div class="footer">
                <p>&copy; {{ date('Y') }} i-PESO Urdaneta City. All rights reserved.</p>
                <p>This is an automated message. Please do not reply directly to this email.</p>
            </div>
        </div>
    </div>
</body>
</html>
