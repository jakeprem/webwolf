defmodule WebWolfWeb.Router do
  use WebWolfWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_flash
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", WebWolfWeb do
    pipe_through :browser # Use the default browser stack

    get "/", PageController, :index
    get "/client", PageController, :client
    get "/server", PageController, :server
    get "/game", PageController, :game
  end

  # Other scopes may use custom stacks.
  # scope "/api", WebWolfWeb do
  #   pipe_through :api
  # end
end
