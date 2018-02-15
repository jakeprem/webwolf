defmodule WebWolfWeb.PageController do
  use WebWolfWeb, :controller

  def index(conn, _params) do
    render conn, "index.html"
  end
end
