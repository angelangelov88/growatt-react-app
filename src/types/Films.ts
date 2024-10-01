type film = {
  title: string;
  director: string;
  releaseDate: string;
  speciesConnection: {
    species: {
      name: string;
      classification: string;
      homeworld: {
        name: string;
      }
    }
  }
}

export type { film };