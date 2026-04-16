import { render, screen, waitFor } from "@testing-library/react";
import DriverRequests from "../pages/DriverRequests";
import { MemoryRouter } from "react-router-dom";

// Mock fetch global
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        demandes: [
          {
            id: 1,
            first_name: "Diarra",
            last_name: "Test",
            lieu_depart: "Ottawa",
            lieu_arrivee: "Montreal",
            statut: "en_attente",
            nb_places_reservees: 2,
          },
        ],
      }),
  })
);

describe("DriverRequests", () => {
  test("affiche une demande de réservation", async () => {
    render(
      <MemoryRouter>
        <DriverRequests />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Diarra Test/i)).toBeInTheDocument();
    expect(screen.getByText(/Ottawa → Montreal/i)).toBeInTheDocument();
  });

  test("affiche les boutons si en attente", async () => {
    render(
      <MemoryRouter>
        <DriverRequests />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Accepter/i)).toBeInTheDocument();
      expect(screen.getByText(/Refuser/i)).toBeInTheDocument();
    });
  });

  test("affiche statut accepté correctement", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            demandes: [
              {
                id: 2,
                first_name: "Diarra",
                last_name: "Test",
                lieu_depart: "Ottawa",
                lieu_arrivee: "Montreal",
                statut: "acceptee",
                nb_places_reservees: 1,
              },
            ],
          }),
      })
    );

    render(
      <MemoryRouter>
        <DriverRequests />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Réservation acceptée/i)).toBeInTheDocument();
  });
});