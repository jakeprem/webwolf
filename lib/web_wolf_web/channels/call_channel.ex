defmodule WebWolfWeb.CallChannel do
  use Phoenix.Channel

  def join("call:" <> _topic, _auth_msg, socket) do
    {:ok, socket}
  end

  # def join("call", _auth_msg, socket) do
  #   {:ok, socket}
  # end

  def handle_in("call:" <> username, message, socket) do
    WebWolfWeb.Endpoint.broadcast("call:" <> username, "call_incoming", message)
    {:noreply, socket}
  end

  # def handle_in("message", %{"body" => body}, socket) do
  #   broadcast! socket, "message", %{body: body}
  #   {:noreply, socket}
  # end
end