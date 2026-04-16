import { render, screen } from "@testing-library/react";
import MyRequests from "../pages/MyRequests";
import { MemoryRouter } from "react-router-dom";
import '@testing-library/jest-dom';

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        reservations: [
          {
            id: 1,
            lieu_depart: "Ottawa",
            lieu_arrivee: "Montreal",
            date_depart: "2026-04-10",
            heure_depart: "10:00",
            statut: "acceptee",
          },
        ],
      }),
  })
);

describe("MyRequests", () => {
  test("affiche une réservation", async () => {
    render(
      <MemoryRouter>
        <MyRequests />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Ottawa/i)).toBeInTheDocument();
    expect(screen.getByText(/Montreal/i)).toBeInTheDocument();
  });

  test("affiche statut accepté", async () => {
    render(
      <MemoryRouter>
        <MyRequests />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Réservation acceptée/i)).toBeInTheDocument();
  });

  test("affiche statut en attente", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            reservations: [
              {
                id: 2,
                lieu_depart: "Ottawa",
                lieu_arrivee: "Toronto",
                date_depart: "2026-04-10",
                heure_depart: "12:00",
                statut: "en_attente",
              },
            ],
          }),
      })
    );

    render(
      <MemoryRouter>
        <MyRequests />
      </MemoryRouter>
    );

    expect(await screen.findByText(/En attente/i)).toBeInTheDocument();
  });
});