type Token = Readonly<{
  type: string;
  lexeme: string;
  offset: number;
}>;

export default Token;
