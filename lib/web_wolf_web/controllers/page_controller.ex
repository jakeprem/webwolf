defmodule WebWolfWeb.PageController do
  use WebWolfWeb, :controller

  def index(conn, _params) do
    render conn, "index.html"
  end

  def client(conn, _params) do
    conn = put_layout conn, false
    render conn, "client.html"
  end

  def server(conn, _params) do
    conn = put_layout conn, false
    render conn, "server.html"
  end
end
