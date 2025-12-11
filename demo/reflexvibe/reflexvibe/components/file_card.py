"""File/document card component."""

import reflex as rx
from ..state import AppState, LibraryItem


def file_card(item: LibraryItem) -> rx.Component:
    """Document card showing thumbnail, title, and metadata."""
    is_selected = AppState.current_item_id == item.id
    
    return rx.box(
        rx.vstack(
            # Thumbnail area
            rx.box(
                rx.center(
                    rx.icon(
                        "file-text",
                        size=48,
                        color="var(--gray-8)",
                    ),
                    width="100%",
                    height="100%",
                ),
                width="100%",
                height="140px",
                background="linear-gradient(135deg, var(--gray-3), var(--gray-4))",
                border_radius="12px 12px 0 0",
                overflow="hidden",
            ),
            
            # Content area
            rx.vstack(
                rx.text(
                    item.title,
                    size="3",
                    weight="medium",
                    color="var(--gray-12)",
                    style={
                        "overflow": "hidden",
                        "text-overflow": "ellipsis",
                        "white-space": "nowrap",
                        "width": "100%",
                    },
                ),
                rx.hstack(
                    rx.icon(
                        "file-text",
                        size=12,
                        color="var(--gray-9)",
                    ),
                    rx.text(
                        item.source_type,
                        size="1",
                        color="var(--gray-9)",
                    ),
                    spacing="1",
                    align="center",
                ),
                spacing="1",
                padding="12px",
                width="100%",
                align="start",
            ),
            
            # Hover overlay with play button
            rx.box(
                rx.center(
                    rx.icon_button(
                        rx.icon("play", size=24),
                        size="3",
                        variant="solid",
                        color_scheme="orange",
                        radius="full",
                        on_click=lambda: [
                            AppState.select_item(item.id),
                            AppState.toggle_playback(),
                        ],
                    ),
                    width="100%",
                    height="100%",
                ),
                position="absolute",
                top="0",
                left="0",
                right="0",
                bottom="0",
                background="rgba(0, 0, 0, 0.5)",
                border_radius="12px",
                opacity="0",
                transition="opacity 0.2s ease",
                _group_hover={"opacity": "1"},
            ),
            
            spacing="0",
            width="100%",
        ),
        width="200px",
        background="var(--gray-2)",
        border_radius="12px",
        border=rx.cond(
            is_selected,
            "2px solid var(--accent-9)",
            "1px solid var(--gray-4)"
        ),
        overflow="hidden",
        cursor="pointer",
        position="relative",
        transition="all 0.2s ease",
        _hover={
            "border-color": "var(--accent-7)",
            "transform": "translateY(-2px)",
            "box-shadow": "0 8px 24px rgba(0, 0, 0, 0.1)",
        },
        class_name="group",
        on_click=lambda: AppState.select_item(item.id),
    )


def file_list_item(item: LibraryItem) -> rx.Component:
    """Document list item for list view."""
    is_selected = AppState.current_item_id == item.id
    
    return rx.box(
        rx.hstack(
            # Icon
            rx.center(
                rx.icon(
                    "file-text",
                    size=24,
                    color="var(--gray-9)",
                ),
                width="48px",
                height="48px",
                background="var(--gray-3)",
                border_radius="8px",
            ),
            
            # Info
            rx.vstack(
                rx.text(
                    item.title,
                    size="3",
                    weight="medium",
                    color="var(--gray-12)",
                ),
                rx.text(
                    item.content,
                    size="2",
                    color="var(--gray-9)",
                    style={
                        "overflow": "hidden",
                        "text-overflow": "ellipsis",
                        "white-space": "nowrap",
                        "max-width": "400px",
                    },
                ),
                spacing="1",
                align="start",
                flex="1",
            ),
            
            # Type badge
            rx.badge(
                item.source_type,
                size="1",
                color_scheme="gray",
            ),
            
            # Play button
            rx.icon_button(
                rx.icon("play", size=16),
                size="2",
                variant="soft",
                color_scheme="orange",
                on_click=lambda: [
                    AppState.select_item(item.id),
                    AppState.toggle_playback(),
                ],
            ),
            
            # Delete button
            rx.icon_button(
                rx.icon("trash-2", size=16),
                size="2",
                variant="ghost",
                color_scheme="red",
                on_click=lambda: AppState.delete_item(item.id),
            ),
            
            spacing="4",
            align="center",
            width="100%",
        ),
        padding="12px 16px",
        background=rx.cond(is_selected, "var(--accent-2)", "var(--gray-1)"),
        border="1px solid var(--gray-4)",
        border_radius="10px",
        cursor="pointer",
        transition="all 0.15s ease",
        _hover={
            "background": "var(--gray-3)",
        },
        on_click=lambda: AppState.select_item(item.id),
    )
