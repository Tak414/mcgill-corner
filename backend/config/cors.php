<?php

$frontendUrl = env('FRONTEND_URL');

return [
    'paths' => ['api/*'],
    'allowed_methods' => ['GET', 'POST', 'DELETE', 'OPTIONS'],
    'allowed_origins' => array_values(array_unique(array_filter([
        'http://localhost:5173',
        is_string($frontendUrl) && $frontendUrl !== '' ? rtrim($frontendUrl, '/') : null,
    ]))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'Origin', 'X-Requested-With'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
