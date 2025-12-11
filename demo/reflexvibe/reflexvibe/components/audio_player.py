"""Audio player component."""

import reflex as rx
from ..state import AppState


def speed_button(speed: float, label: str) -> rx.Component:
    """Speed selection button."""
    is_active = AppState.playback_speed == speed
    
    return rx.button(
        label,
        size="1",
        variant=rx.cond(is_active, "soft", "ghost"),
        color_scheme=rx.cond(is_active, "orange", "gray"),
        on_click=lambda: AppState.set_playback_speed(speed),
    )


def audio_player() -> rx.Component:
    """Bottom audio player bar with controls."""
    return rx.box(
        rx.hstack(
            # Now playing info
            rx.hstack(
                rx.center(
                    rx.icon("audio-waveform", size=20, color="var(--accent-9)"),
                    width="44px",
                    height="44px",
                    background="var(--accent-3)",
                    border_radius="8px",
                ),
                rx.vstack(
                    rx.text(
                        "Now Playing",
                        size="1",
                        color="var(--gray-9)",
                        weight="medium",
                    ),
                    rx.text(
                        AppState.current_text,
                        size="2",
                        color="var(--gray-12)",
                        style={
                            "overflow": "hidden",
                            "text-overflow": "ellipsis",
                            "white-space": "nowrap",
                            "max-width": "250px",
                        },
                    ),
                    spacing="0",
                    align="start",
                ),
                spacing="3",
                align="center",
                min_width="300px",
            ),
            
            rx.spacer(),
            
            # Main controls
            rx.hstack(
                rx.icon_button(
                    rx.icon("skip-back", size=18),
                    size="2",
                    variant="ghost",
                    color_scheme="gray",
                ),
                rx.icon_button(
                    rx.icon("rewind", size=18),
                    size="2",
                    variant="ghost",
                    color_scheme="gray",
                ),
                rx.icon_button(
                    rx.cond(
                        AppState.is_playing,
                        rx.icon("pause", size=24),
                        rx.icon("play", size=24),
                    ),
                    size="3",
                    variant="solid",
                    color_scheme="orange",
                    radius="full",
                    on_click=AppState.toggle_playback,
                ),
                rx.icon_button(
                    rx.icon("fast-forward", size=18),
                    size="2",
                    variant="ghost",
                    color_scheme="gray",
                ),
                rx.icon_button(
                    rx.icon("skip-forward", size=18),
                    size="2",
                    variant="ghost",
                    color_scheme="gray",
                ),
                spacing="2",
                align="center",
            ),
            
            rx.spacer(),
            
            # Right controls
            rx.hstack(
                # Speed display button
                rx.menu.root(
                    rx.menu.trigger(
                        rx.button(
                            rx.hstack(
                                rx.text(AppState.playback_speed, size="2"),
                                rx.text("x", size="2"),
                                spacing="0",
                            ),
                            variant="ghost",
                            color_scheme="gray",
                            size="2",
                        ),
                    ),
                    rx.menu.content(
                        rx.menu.item("0.5x", on_click=lambda: AppState.set_playback_speed(0.5)),
                        rx.menu.item("0.75x", on_click=lambda: AppState.set_playback_speed(0.75)),
                        rx.menu.item("1.0x", on_click=lambda: AppState.set_playback_speed(1.0)),
                        rx.menu.item("1.25x", on_click=lambda: AppState.set_playback_speed(1.25)),
                        rx.menu.item("1.5x", on_click=lambda: AppState.set_playback_speed(1.5)),
                        rx.menu.item("2.0x", on_click=lambda: AppState.set_playback_speed(2.0)),
                    ),
                ),
                
                # Voice selector
                rx.button(
                    rx.hstack(
                        rx.avatar(
                            fallback="Vi",
                            size="1",
                            radius="full",
                        ),
                        rx.text(
                            rx.cond(
                                AppState.current_voice != "",
                                AppState.current_voice,
                                "Select Voice"
                            ),
                            size="2",
                        ),
                        rx.icon("chevron-up", size=14),
                        spacing="2",
                        align="center",
                    ),
                    variant="ghost",
                    color_scheme="gray",
                    on_click=AppState.toggle_voice_picker,
                ),
                
                spacing="3",
                align="center",
                min_width="200px",
                justify="end",
            ),
            
            spacing="4",
            align="center",
            width="100%",
        ),
        padding="12px 24px",
        background="var(--gray-1)",
        border_top="1px solid var(--gray-4)",
        position="fixed",
        bottom="0",
        left="220px",
        right="0",
        z_index="100",
    )
