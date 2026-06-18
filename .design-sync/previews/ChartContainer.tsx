import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "web";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";

const seatsConfig = {
  seats: {
    label: "Seats",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const seatsData = [
  { maand: "jan", seats: 18 },
  { maand: "feb", seats: 24 },
  { maand: "mrt", seats: 31 },
  { maand: "apr", seats: 29 },
  { maand: "mei", seats: 42 },
  { maand: "jun", seats: 56 },
];

export function Bars() {
  return (
    <div style={{ width: 380, height: 240 }}>
      <ChartContainer
        config={seatsConfig}
        style={{ width: "100%", height: "100%" }}
        initialDimension={{ width: 380, height: 240 }}
      >
        <BarChart data={seatsData} width={380} height={240}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="maand" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis width={28} tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="seats"
            fill="var(--color-seats)"
            radius={4}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

const minutesConfig = {
  minuten: {
    label: "Dicteer-minuten",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const minutesData = [
  { dag: "ma", minuten: 42 },
  { dag: "di", minuten: 58 },
  { dag: "wo", minuten: 51 },
  { dag: "do", minuten: 73 },
  { dag: "vr", minuten: 64 },
];

export function Lines() {
  return (
    <div style={{ width: 380, height: 240 }}>
      <ChartContainer
        config={minutesConfig}
        style={{ width: "100%", height: "100%" }}
        initialDimension={{ width: 380, height: 240 }}
      >
        <LineChart data={minutesData} width={380} height={240}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="dag" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis width={28} tickLine={false} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            dataKey="minuten"
            type="monotone"
            stroke="var(--color-minuten)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
