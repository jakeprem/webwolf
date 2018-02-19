defmodule WebWolfWeb.SockChannel do
  use Phoenix.Channel

  def join("sock", _auth_msg, socket) do
    {:ok, socket}
  end

  def handle_in("username:set", %{"user" => user}, socket) do
    {:noreply, assign(socket, :user, user)}
  end
end