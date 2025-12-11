"""Voice picker component."""

import reflex as rx
from ..state import AppState


def voice_item(voice: rx.Var[str]) -> rx.Component:
    """Individual voice item in the picker."""
    is_selected = AppState.current_voice == voice
    
    # Get initials (first 2 chars, uppercase)
    initials = voice[:2].upper()
    
    return rx.box(
        rx.hstack(
            rx.avatar(
                fallback=initials,
                size="2",
                radius="full",
                color_scheme="orange",
            ),
            rx.vstack(
                rx.text(
                    voice,
                    size="2",
                    weight="medium",
                    color="var(--gray-12)",
                ),
                rx.text(
                    "Voice preset",
                    size="1",
                    color="var(--gray-9)",
                ),
                spacing="0",
                align="start",
            ),
            rx.spacer(),
            rx.cond(
                is_selected,
                rx.icon("check", size=16, color="var(--accent-9)"),
                rx.fragment(),
            ),
            spacing="3",
            align="center",
            width="100%",
        ),
        padding="10px 12px",
        background=rx.cond(is_selected, "var(--accent-3)", "transparent"),
        border_radius="8px",
        cursor="pointer",
        transition="background 0.15s ease",
        _hover={
            "background": "var(--gray-3)",
        },
        on_click=lambda: AppState.select_voice(voice),
    )


def voice_picker() -> rx.Component:
    """Voice selection modal/panel."""
    return rx.cond(
        AppState.show_voice_picker,
        rx.box(
            # Backdrop
            rx.box(
                position="fixed",
                top="0",
                left="0",
                right="0",
                bottom="0",
                background="rgba(0, 0, 0, 0.5)",
                z_index="199",
                on_click=AppState.toggle_voice_picker,
            ),
            
            # Panel
            rx.box(
                rx.vstack(
                    # Header
                    rx.hstack(
                        rx.heading("Choose Voice", size="4"),
                        rx.spacer(),
                        rx.icon_button(
                            rx.icon("x", size=18),
                            size="2",
                            variant="ghost",
                            on_click=AppState.toggle_voice_picker,
                        ),
                        width="100%",
                        align="center",
                    ),
                    
                    # Search
                    rx.box(
                        rx.hstack(
                            rx.icon("search", size=16, color="var(--gray-9)"),
                            rx.input(
                                placeholder="Search voices...",
                                variant="soft",
                                size="2",
                                width="100%",
                            ),
                            spacing="2",
                            align="center",
                            padding="8px 12px",
                            background="var(--gray-3)",
                            border_radius="8px",
                        ),
                        width="100%",
                    ),
                    
                    # Voice list
                    rx.scroll_area(
                        rx.vstack(
                            rx.cond(
                                AppState.voices.length() > 0,
                                rx.foreach(AppState.voices, voice_item),
                                rx.center(
                                    rx.vstack(
                                        rx.icon("wifi-off", size=32, color="var(--gray-8)"),
                                        rx.text(
                                            "No voices available",
                                            size="2",
                                            color="var(--gray-9)",
                                        ),
                                        rx.text(
                                            "Check server connection",
                                            size="1",
                                            color="var(--gray-8)",
                                        ),
                                        spacing="2",
                                        align="center",
                                    ),
                                    padding="40px",
                                ),
                            ),
                            spacing="1",
                            width="100%",
                        ),
                        type="hover",
                        scrollbars="vertical",
                        style={"height": "350px"},
                    ),
                    
                    spacing="4",
                    width="100%",
                ),
                position="fixed",
                bottom="80px",
                right="24px",
                width="320px",
                max_height="500px",
                background="var(--gray-1)",
                border="1px solid var(--gray-4)",
                border_radius="12px",
                padding="16px",
                box_shadow="0 16px 48px rgba(0, 0, 0, 0.2)",
                z_index="200",
            ),
        ),
        rx.fragment(),
    )
