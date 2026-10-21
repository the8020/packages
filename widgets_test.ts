import { assertEquals, assertThrows } from "@std/assert";
import { parseWidget, parseWidgetCategories, readWidgets } from "./widgets.ts";

const users = `schema = 1
title = "Users"
description = "Manage accounts"
icon = "group"
category = "administration"
order = 10

[open]
program = "the8020/users/users"
`;

Deno.test("widget declarations parse with defaults", () => {
  assertEquals(parseWidget(users, "the8020/users/users"), {
    id: "the8020/users/users",
    package: "the8020/users",
    title: "Users",
    description: "Manage accounts",
    icon: "group",
    category: "administration",
    order: 10,
    open: { program: "the8020/users/users", arguments: [] },
  });
  const minimal = parseWidget(
    `schema = 1\ntitle = "Jobs"\n[open]\nprogram = "the8020/jobs/jobs"\narguments = ["--all"]\n`,
    "the8020/jobs/jobs",
  );
  assertEquals(minimal.description, "");
  assertEquals(minimal.order, 0);
  assertEquals(minimal.category, undefined);
  assertEquals(minimal.open.arguments, ["--all"]);
});

Deno.test("widget declarations accept an optional live data program", () => {
  const widget = parseWidget(
    `${users}\n[data]\nprogram = "the8020/users/widget-status"\narguments = ["all"]\nrefresh = 60\n`,
    "the8020/users/users",
  );
  assertEquals(widget.data, {
    program: "the8020/users/widget-status",
    arguments: ["all"],
    refresh: 60,
  });
  assertEquals(
    parseWidget(
      `${users}\n[data]\nprogram = "the8020/users/widget-status"\n`,
      "the8020/users/users",
    ).data,
    { program: "the8020/users/widget-status", arguments: [] },
  );
  for (
    const [data, message] of [
      ['program = "the8020/users/widget-status"\nrefresh = 5', "10–3600"],
      ['program = "status"', "data.program"],
      [
        'program = "the8020/users/widget-status"\ncache = 1',
        "unknown data key",
      ],
    ] as const
  ) {
    assertThrows(
      () => parseWidget(`${users}\n[data]\n${data}\n`, "the8020/users/users"),
      TypeError,
      message,
    );
  }
});

Deno.test("widget declarations accept an exact visibility permission", () => {
  assertEquals(
    parseWidget(
      `${users}\n[visible]\npermission = "the8020.users.user.view"\n`,
      "the8020/users/users",
    ).visible,
    { permission: "the8020.users.user.view" },
  );
  assertEquals(
    parseWidget(`${users}\n[visible]\npublic = true\n`, "the8020/users/users")
      .visible,
    { public: true },
  );
  for (
    const [visible, message] of [
      ['permission = "the8020.users.*"', "exact action name"],
      ["permission = 1", "exact action name"],
      ['permission = "a.b"\nrole = "x"', "unknown visible key role"],
      ["public = false", "visible.public must be true"],
      ['public = true\npermission = "a.b"', "exclude visible.permission"],
    ] as const
  ) {
    assertThrows(
      () =>
        parseWidget(`${users}\n[visible]\n${visible}\n`, "the8020/users/users"),
      TypeError,
      message,
    );
  }
});

Deno.test("widget declarations reject unknown keys and invalid values", () => {
  for (
    const [text, message] of [
      [users.replace("order = 10", "colour = 1"), "unknown widget key colour"],
      [users.replace('icon = "group"', 'icon = "Group!"'), "Material Symbols"],
      [
        users.replace('"administration"', '"Administration"'),
        "lowercase key",
      ],
      [users.replace('"the8020/users/users"', '"users"'), "open.program"],
      [users.replace("schema = 1", "schema = 2"), "schema must be 1"],
      [
        `${users}[translations.cs]\ntitle = "Uživatelé"\n`,
        "unknown widget key translations",
      ],
      ['schema = 1\ntitle = "x"\n', "open must be a table"],
    ] as const
  ) {
    assertThrows(
      () => parseWidget(text, "the8020/users/users"),
      TypeError,
      message,
    );
  }
});

Deno.test("widget categories parse titles, icons and order", () => {
  assertEquals(
    parseWidgetCategories(`[administration]
title = "Administration"
icon = "admin_panel_settings"
order = 20

["administration/packages"]
title = "Packages"
`),
    [{
      key: "administration",
      title: "Administration",
      icon: "admin_panel_settings",
      order: 20,
    }, {
      key: "administration/packages",
      title: "Packages",
    }],
  );
  assertThrows(
    () => parseWidgetCategories(`[Admin]\ntitle = "x"\n`),
    TypeError,
    "lowercase key",
  );
});

Deno.test("installed widgets are read per package and isolate broken files", async () => {
  const root = await Deno.makeTempDir({ prefix: "the8020-widgets-" });
  try {
    const write = async (path: string, text: string) => {
      await Deno.mkdir(`${root}/${path.split("/").slice(0, -1).join("/")}`, {
        recursive: true,
      });
      await Deno.writeTextFile(`${root}/${path}`, text);
    };
    await write("the8020/users/widgets/users.toml", users);
    await write("the8020/users/widgets/broken.toml", "schema = 1\n");
    await write(
      "the8020/users/widgets/categories.toml",
      `[administration]\ntitle = "Administration"\norder = 10\n`,
    );
    await write(
      "acme/orders/widgets/categories.toml",
      `[administration]\ntitle = "Admin"\nicon = "settings"\n`,
    );
    await write("acme/orders/package.toml", "schema = 1\n");
    const catalog = await readWidgets(root);
    assertEquals(catalog.widgets.map((widget) => widget.id), [
      "the8020/users/users",
    ]);
    assertEquals(catalog.problems.map((problem) => problem.path), [
      `${root}/the8020/users/widgets/broken.toml`,
    ]);
    assertEquals(catalog.categories, [{
      key: "administration",
      title: "Admin",
      icon: "settings",
      order: 10,
    }]);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
