"use strict";

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkInsert("cell_groups", [
      {
        name: "Cell Group 11 UPS 5",
        area: "UPS 5",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Cell Group 12 Sucat",
        area: "Sucat",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Cell Group 13 Tambo",
        area: "Tambo",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Cell Group 14 Silverio",
        area: "Silverio",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Cell Group 21 Delara",
        area: "Delara",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Cell Group 22 Sampaloc",
        area: "Sampaloc",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Cell Group 23 4TH Estate",
        area: "4TH Estate",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Cell Group 24 BF",
        area: "BF",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Cell Group 31 CAA",
        area: "CAA",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Cell Group 32 TS Cruz",
        area: "TS Cruz",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Cell Group 33 Las Pinas",
        area: "Las Pinas",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Cell Group 41 Masville",
        area: "Masville",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Cell Group 42 Waterfun",
        area: "Waterfun",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Cell Group 43 Taguig",
        area: "Taguig",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Cell Group 51 Lakefront",
        area: "Lakefront",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Cell Group 52 Lakefront B",
        area: "Lakefront B",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Cell Group 53 Don Bosco",
        area: "Don Bosco",
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("cell_groups", null, {});
  },
};
