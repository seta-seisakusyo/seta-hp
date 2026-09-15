# shellcheck shell=bash
# DESIGNER_PROJECT_DIR / DESIGNER_ENV_FILE / DESIGNER_COMPOSE_FILE の代入後に source すること。

configure_designer_compose() {
  if [ -z "$DESIGNER_ENV_FILE" ]; then
    if [ -f "$DESIGNER_PROJECT_DIR/.env.prod" ]; then
      DESIGNER_ENV_FILE="$DESIGNER_PROJECT_DIR/.env.prod"
    else
      DESIGNER_ENV_FILE="$DESIGNER_PROJECT_DIR/.env"
    fi
  fi

  if [ -z "$DESIGNER_COMPOSE_FILE" ]; then
    if [ "$(basename "$DESIGNER_ENV_FILE")" = ".env.prod" ] && [ -f "$DESIGNER_PROJECT_DIR/docker-compose.prod.yml" ]; then
      DESIGNER_COMPOSE_FILE="$DESIGNER_PROJECT_DIR/docker-compose.prod.yml"
    else
      DESIGNER_COMPOSE_FILE="$DESIGNER_PROJECT_DIR/docker-compose.yml"
    fi
  fi
}

designer_compose() {
  docker compose --project-directory "$DESIGNER_PROJECT_DIR" --env-file "$DESIGNER_ENV_FILE" \
    -f "$DESIGNER_COMPOSE_FILE" "$@"
}
