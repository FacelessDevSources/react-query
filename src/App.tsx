import './App.css';
import { useQuery } from './lib';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const usePosts = () => {
  return useQuery({
    queryKey: 'posts2',
    queryFn: async () => {
      await sleep(500);
      const response = await fetch(
        'https://jsonplaceholder.typicode.com/posts',
      );
      const data = await response.json();
      return data.slice(0, 7);
    },
  });
};

function App() {
  const { isFetching: isLoading, data } = usePosts();

  return (
    <>
      <h1>hi</h1>
      {isLoading && <h1>Loading...</h1>}
      {data && data.map((item) => <p key={item.id}>{item.title}</p>)}
    </>
  );
}

export default App;
