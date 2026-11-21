# Laravel Setup Guide

This guide installs and runs the Laravel backend in `backend/`. The project uses PHP 8.3+, Composer, Node.js/npm, SQLite, and Laravel 13.

## 1. Install Git

Verify Git is installed:

```bash
git --version
```

### Windows

Install Git and Git for Windows:

```powershell
winget install --id Git.Git
```

You can use **PowerShell** or **Git Bash** for the commands below.

### macOS

Install Git and Homebrew if needed:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install git
```

### Linux

Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y git
```

## 2. Install PHP 8.3+ and Composer

PHP must have the SQLite and common CLI extensions enabled.

### Windows

The easiest option is [Laravel Herd](https://herd.laravel.com/). It provides PHP, Nginx, and an appropriate terminal environment.

After installing Herd:

1. Open Herd.
2. Select PHP 8.3 or newer.
3. Install Composer if Herd did not include it.

Alternatively, install Composer directly with [Composer for Windows](https://getcomposer.org/download/).

Verify both tools:

```powershell
php --version
composer --version
```

### macOS

```bash
brew install php@8.3 composer
brew services start php@8.3
echo 'export PATH="/opt/homebrew/opt/php@8.3/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Apple Silicon normally uses `/opt/homebrew`. On Intel Macs, use `/usr/local/opt/php@8.3/bin` instead.

Verify:

```bash
php --version
composer --version
```

### Linux

On Ubuntu 24.04 or another distribution with PHP 8.3+ available:

```bash
sudo apt install -y php8.3-cli php8.3-mbstring php8.3-xml php8.3-curl php8.3-sqlite3 unzip
```

Install Composer:

```bash
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
php composer-setup.php
php -r "unlink('composer-setup.php');"
sudo mv composer.phar /usr/local/bin/composer
```

If your distribution has an older PHP package, install PHP 8.3+ through your distribution's package repository or [php.new](https://php.new/) instead of continuing with the older version.

## 3. Install Node.js and npm

Use Node.js 20.19+ or 22.12+.

### Windows

```powershell
winget install --id OpenJS.NodeJS.LTS
```

### macOS

```bash
brew install node
```

### Linux

Using `nvm`:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

Restart the terminal, then:

```bash
nvm install --lts
nvm use --lts
```

Verify:

```bash
node --version
npm --version
```

## 4. Clone the repository

```bash
git clone git@github.com:herui-wang/mcgill-corner.git
cd mcgill-corner/backend
```

If SSH is not configured on GitHub, use HTTPS instead:

```bash
git clone https://github.com/herui-wang/mcgill-corner.git
cd mcgill-corner/backend
```

## 5. Create the local environment file

### macOS/Linux

```bash
cp .env.example .env
touch database/database.sqlite
```

### Windows PowerShell

```powershell
Copy-Item .env.example .env
New-Item -ItemType File -Path database/database.sqlite -Force
```

The project is configured to use SQLite in `.env.example`, so no MySQL or PostgreSQL server is required.

## 6. Install dependencies

Run these commands from the `backend/` directory:

```bash
composer install
npm install
```

Generate the application key:

```bash
php artisan key:generate
```

Create the database tables:

```bash
php artisan migrate
```

If you get a SQLite error, confirm that `database/database.sqlite` exists and that PHP's SQLite extension is enabled.

### Optional setup command

After cloning and creating `.env` and `database/database.sqlite`, you can run:

```bash
composer run setup
```

This installs Composer dependencies, generates the app key, runs migrations, and builds frontend assets.

## 7. Start the application

Open two terminals in `backend/`.

Terminal 1 - Laravel:

```bash
php artisan serve
```

Terminal 2 - Vite:

```bash
npm run dev
```

Open <http://localhost:8000>.

To stop either process, press `Ctrl+C` in its terminal.

For a one-command development process, you can also try:

```bash
composer run dev
```

## 8. Common commands

All commands below must be run from `backend/`.

```bash
php artisan migrate          # Run pending migrations
php artisan migrate:fresh    # Delete and recreate all tables
php artisan route:list       # List application routes
php artisan test             # Run tests
npm run dev                  # Start the Vite development server
npm run build                # Build frontend assets for production
```

Use `php artisan migrate:fresh` only when you do not need the local database data, since it deletes every table.

## 9. Troubleshooting

### `php: command not found`

- Restart the terminal after installing PHP.
- Confirm the PHP install directory is in `PATH`.
- On macOS, confirm whether you are using `/opt/homebrew` or `/usr/local`.

### `composer: command not found`

Reinstall Composer or add its executable directory to `PATH`.

### `could not find driver`

Enable or install the PDO SQLite extension for PHP:

```bash
php -m | grep -i sqlite
```

On Linux, install `php-sqlite3` and use the matching PHP version.

### `database/database.sqlite does not exist`

Create it again:

macOS/Linux:

```bash
touch database/database.sqlite
```

Windows PowerShell:

```powershell
New-Item -ItemType File -Path database/database.sqlite -Force
```

### `Vite manifest not found`

Start `npm run dev`, or create production assets:

```bash
npm run build
```

### Application changes do not appear

Clear Laravel caches:

```bash
php artisan optimize:clear
```
