defmodule WebWolfWeb.RoomChannel do
  use Phoenix.Channel
  alias WebWolfWeb.Presence

  def join("room:lobby", _, socket) do
    send self(), :after_join
    {:ok, socket}
  end

  def join("room:" <> topic, _params, socket) do
    IO.puts(topic)
    send self(), :after_join
    {:ok, socket}
  end

  def handle_info(:after_join, socket) do
    Presence.track(socket, socket.assigns.user, %{
      online_at: :os.system_time(:milli_seconds)
    })
    push socket, "presence_state", Presence.list(socket)
    {:noreply, socket}
  end

  def handle_in("whisper:" <> username, message, socket) do
      WebWolfWeb.Endpoint.broadcast("room:" <> username, "whispered", message)
    {:noreply, socket}
  end

  def handle_in("message:new", message, socket) do
    broadcast! socket, "message:new", %{
      user: socket.assigns.user,
      body: message,
      timestamp: :os.system_time(:milli_seconds)
    }
    {:noreply, socket}
  end

  
end