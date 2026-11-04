import { test } from "node:test";
import assert from "node:assert/strict";
import { authorInitials, contributorRanking, contributorTitle, nextContributorStep } from "./kineExercises.ts";

test("initiales de l'auteur", () => {
  assert.equal(authorInitials("Marie Laurent · Cabinet Exemple"), "ML");
  assert.equal(authorInitials("Dr. Julien Martin"), "JM");
  assert.equal(authorInitials("Sophie"), "S");
  assert.equal(authorInitials(null), "K");
});

test("titre de contributeur à 5, 10 et 20 exercices publiés", () => {
  assert.equal(contributorTitle(4), null);
  assert.equal(contributorTitle(5), "Contributeur EasyPhysio");
  assert.equal(contributorTitle(12), "Contributeur EasyPhysio ×10");
  assert.equal(contributorTitle(20), "Contributeur EasyPhysio ×20");
  assert.equal(nextContributorStep(3), "Encore 2 exercices publiés pour « Contributeur EasyPhysio ».");
  assert.equal(nextContributorStep(9), "Encore 1 exercice publié pour « Contributeur EasyPhysio ×10 ».");
  assert.equal(nextContributorStep(25), null);
});

test("classement : exercices publiés de kinés seulement, du plus au moins", () => {
  const r = contributorRanking([
    { created_by: "a", publication_status: "published", author_label: "A" },
    { created_by: "b", publication_status: "published", author_label: "B" },
    { created_by: "b", publication_status: "published", author_label: "B" },
    { created_by: "b", publication_status: "pending", author_label: "B" },
    { created_by: null, publication_status: "published", author_label: null },
  ]);
  assert.deepEqual(r.map((x) => [x.authorId, x.count]), [["b", 2], ["a", 1]]);
});
