"""Header component with actions and filters."""

import reflex as rx
from ..state import AppState


def action_button(icon: str, label: str, on_click=None, primary: bool = False) -> rx.Component:
    """Action button in the header."""
    return rx.button(
        rx.icon(icon, size=16),
        rx.text(label, size="2"),
        variant="solid" if primary else "soft",
        color_scheme="orange" if primary else "gray",
        cursor="pointer",
        on_click=on_click,
    )


def header() -> rx.Component:
    """Top header with title, actions, and filters."""
    return rx.box(
        rx.hstack(
            # Page title
            rx.heading(
                "Library",
                size="6",
                weight="bold",
            ),
            
            rx.spacer(),
            
            # Action buttons
            rx.hstack(
                action_button("plus", "File", primary=True),
                action_button("podcast", "Podcast"),
                action_button("type", "Text", on_click=AppState.toggle_add_text_modal),
                action_button("link", "Link", on_click=AppState.toggle_add_link_modal),
                action_button("folder-plus", "Folder"),
                spacing="2",
            ),
            
            rx.divider(orientation="vertical", size="2"),
            
            # Filters
            rx.hstack(
                rx.select(
                    ["All Types", "Text", "Web", "File", "Podcast"],
                    default_value="All Types",
                    size="2",
                ),
                rx.select(
                    ["Date Added", "Name", "Recently Played"],
                    default_value="Date Added",
                    size="2",
                ),
                spacing="2",
            ),
            
            rx.divider(orientation="vertical", size="2"),
            
            # View toggle
            rx.hstack(
                rx.icon_button(
                    rx.icon("layout-grid", size=18),
                    variant=rx.cond(AppState.view_mode == "grid", "soft", "ghost"),
                    color_scheme="gray",
                    on_click=AppState.toggle_view_mode,
                ),
                rx.icon_button(
                    rx.icon("list", size=18),
                    variant=rx.cond(AppState.view_mode == "list", "soft", "ghost"),
                    color_scheme="gray",
                    on_click=AppState.toggle_view_mode,
                ),
                spacing="1",
            ),
            
            rx.divider(orientation="vertical", size="2"),
            
            # Search
            rx.box(
                rx.hstack(
                    rx.icon("search", size=16, color="var(--gray-9)"),
                    rx.input(
                        placeholder="Search...",
                        variant="soft",
                        size="2",
                        width="150px",
                    ),
                    spacing="2",
                    align="center",
                ),
            ),
            
            # Connection status
            rx.tooltip(
                rx.box(
                    rx.box(
                        width="8px",
                        height="8px",
                        border_radius="50%",
                        background=rx.cond(
                            AppState.is_connected,
                            "#22c55e",
                            "#ef4444"
                        ),
                    ),
                ),
                content=AppState.connection_status,
            ),
            
            # User avatar
            rx.avatar(
                fallback="U",
                size="2",
                radius="full",
            ),
            
            spacing="4",
            align="center",
            width="100%",
        ),
        padding="16px 24px",
        background="var(--gray-1)",
        border_bottom="1px solid var(--gray-4)",
    )
