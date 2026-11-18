---
title: In progress and planned
description: What I'm building now and what's next, from redstone CPUs and SystemVerilog to audio DSP and power electronics.
order: 90
bannerAlt: A dark circuit board with gold traces linking chips named after the projects on this page, among them RV32I, FIR, I2S, a 48 V to 12 V buck converter and an ESP32, with the redstone chip outlined as the one in progress
---

Projects I'm working on now or have lined up, grouped by area. Within each area they're
roughly in the order I plan to do them, since the early ones teach what the later ones
need. Each says what it is, why I'm doing it and what I need to learn first.

## Redstone CPU

**Clocked redstone adder and ALU** *(in progress)*\
Adding a clock to my [16-bit redstone adder](/projects/minecraft-adder/), then building a
redstone ALU and clocking that too. The first step is done: an accumulator and a flags
register, driven by a clocked counter that steps through an instruction ROM.\
*Why:* sequential logic is where combinational blocks become a computer. Timing, registers
and control are exactly what synchronous digital design is about, and redstone makes every
propagation delay visible.

**Machine learning on a Minecraft CPU**\
For the fun of it: train a very basic ML model, such as a perceptron, on the redstone CPU.\
*Why:* squeezing an algorithm onto hardware this limited forces fixed-point arithmetic and
tight memory budgets, the same trade-offs ML accelerators make.\
*Needs:* the clocked ALU above, and basic ML (linear models, gradient descent).

## Digital design and verification

**16-bit adder/subtractor and 8-bit ALU in SystemVerilog**\
My [Digital Logic Sim ALU](/projects/alu/) rewritten as RTL, with a self-checking
testbench that covers positive, negative and boundary inputs.\
*Why:* it moves designs I already understand into the language industry uses, and the
testbench is my first real verification work.\
*Needs:* SystemVerilog.

**UART transmitter and receiver**\
A UART tested with cocotb, with the regression running on GitHub Actions for every push.\
*Why:* Python testbenches and CI-driven regressions are how many teams verify RTL today.\
*Needs:* SystemVerilog, Python, cocotb, the UART protocol, and a free simulator such as
Icarus Verilog or Verilator.

**FIFO with assertions and a formal check**\
A FIFO with SystemVerilog Assertions, proven in SymbiYosys.\
*Why:* simulation shows a design works for the cases I thought of; formal verification
shows it works for all of them.\
*Needs:* SystemVerilog Assertions, the basics of formal verification, Yosys and
SymbiYosys.

**RV32I RISC-V CPU**\
A CPU for the RV32I base instruction set, checked against the Spike reference simulator.\
*Why:* it pulls everything above together: datapath, control, memory and verification
against a golden model.\
*Needs:* the RISC-V RV32I spec, computer architecture (datapath, control, pipelining),
a little RISC-V assembly, and the GNU toolchain and Spike.

**A small UVM testbench**\
A UVM testbench for one of the blocks above, on EDA Playground.\
*Why:* UVM is the industry standard for verification, and EDA Playground gives free access
to the commercial simulators it needs.\
*Needs:* object-oriented SystemVerilog (classes, randomisation, constraints) and the UVM
structure: agents, drivers, monitors and scoreboards.

## FPGA and silicon

**FPGA board progression**\
On a real board: blink an LED, then UART, then VGA output, then a soft CPU (ideally my
RV32I).\
*Why:* real hardware brings in what simulation hides: clocks, pin constraints, timing
closure and debugging with a logic analyser.\
*Needs:* an FPGA board, its vendor toolchain or the open-source one (Yosys and nextpnr),
constraint files, and the UART and VGA timing specs.

**A Tiny Tapeout design**\
Submitting a small design to Tiny Tapeout to be made on a real chip.\
*Why:* it's the full ASIC flow, from RTL through synthesis and place-and-route to
silicon, at a scale a student can afford.\
*Needs:* a design small enough for one tile, the Tiny Tapeout template and its GitHub
Actions flow, and the basics of synthesis and timing.

## Audio

**Modular audio effects board**\
A breadboard-style board with swappable modules: high-pass, low-pass, EQ, compressor,
distortion and so on.\
*Why:* each module is a filter or nonlinear system I can hear, so the theory gets tested
by ear and on the scope, and it's a full PCB project from schematic to board.\
*Needs:* signals and systems, and finishing the Altium PCB design course.

**FIR filter in fixed-point Verilog**\
An FIR filter checked against a Python/NumPy golden model.\
*Why:* fixed-point DSP in RTL, verified against a floating-point model, is the everyday
work of hardware DSP roles.\
*Needs:* signals and systems (convolution, frequency response), fixed-point arithmetic,
NumPy and SciPy for filter design.

**Effects modules in RTL**\
RTL versions of the effects-board modules: a biquad EQ, a compressor and a clipper.\
*Why:* building the same effect in analog and in digital shows what each does well and
ties the audio work to the verification work.\
*Needs:* the FIR filter above, IIR filters and their stability in fixed point, and the
z-transform.

**I2S transmitter and receiver**\
An I2S interface with assertions that check its timing.\
*Why:* I2S is how audio gets on and off a chip, so it's what connects the RTL effects to
real converters.\
*Needs:* the I2S spec and SystemVerilog Assertions (from the FIFO project).

## Power electronics and the grid

**48 V to 12 V synchronous buck converter**\
Simulated in LTspice, laid out in Altium, then built and measured for efficiency.\
*Why:* 48 V to 12 V conversion is how data centres deliver power to servers, and this
takes a converter from simulation all the way to measurements on a real board.\
*Needs:* power electronics (switching converters, MOSFETs, inductor and capacitor
selection), LTspice, the Altium course, and PCB layout for switching noise and heat.

**ESP32 home energy monitor**\
A clamp-on current transformer and an ESP32 measuring real power $P$, apparent power $S$
and power factor, with ML to tell which appliance is running.\
*Why:* it's real power measurement on live data, and the appliance detection is a
practical first ML problem on signals I collect myself.\
*Needs:* AC power ($P$, $Q$, $S$ and power factor), safe CT and voltage sensing, ESP32
ADC sampling, and basic classification.

**Inverse-time overcurrent protection relay in Verilog**\
A relay whose trip time follows the IEC inverse-time curve, checked against the curve
itself.\
*Why:* protection is a core power-systems job, and it's a place where digital design and
power engineering meet.\
*Needs:* power-system protection and the IEC 60255 curves, fixed-point maths in RTL, and
a Python model to check against.

**Power flow and N-1 contingency analysis**\
Power flow on the IEEE 14-bus system in pandapower or PyPSA, then checking that the grid
survives the loss of any one line or generator.\
*Why:* N-1 security is how real grids are planned and operated, and these tools are what
grid engineers use.\
*Needs:* power-flow analysis (bus types, Newton-Raphson), per-unit systems, and Python.

**Day-ahead Ontario demand forecaster**\
Forecasting tomorrow's Ontario electricity demand from IESO data and the weather, with ML.\
*Why:* utilities and grid operators plan around forecasts like this, and it's real,
messy public data.\
*Needs:* pandas, time-series forecasting, and regression or gradient-boosting models.

## Embedded

**ESP32 or Arduino sensor project**\
A project built around an IMU or a camera.\
*Why:* it's a first step into reading real sensors over I2C or SPI and handling noisy
data.\
*Needs:* C or C++ on a microcontroller, I2C and SPI, and basic filtering of sensor data.

**My own C drivers on a Pi Pico or STM32**\
Writing peripheral drivers myself instead of using the vendor libraries.\
*Why:* going down to the registers is what embedded firmware work is, and it shows how
the hardware I design in RTL looks from the software side.\
*Needs:* C, reading datasheets and reference manuals, memory-mapped registers and
interrupts.
