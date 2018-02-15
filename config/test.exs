use Mix.Config

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :web_wolf, WebWolfWeb.Endpoint,
  http: [port: 4001],
  server: false

# Print only warnings and errors during test
config :logger, level: :warn

# Configure your database
config :web_wolf, WebWolf.Repo,
  adapter: Sqlite.Ecto2,
  database: "test_db.sqlite3"