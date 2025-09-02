use anyhow::Result;
use clap::ValueEnum;
use serde::Serialize;

#[derive(Copy, Clone, Debug, ValueEnum)]
pub enum OutputFormat {
    Text,
    Json,
}

impl OutputFormat {
    pub fn is_json(self) -> bool {
        matches!(self, OutputFormat::Json)
    }
}

pub fn print_json<T: Serialize>(v: &T) -> Result<()> {
    println!("{}", serde_json::to_string_pretty(v)?);
    Ok(())
}

pub fn print_json_array<T: Serialize>(xs: &[T]) -> Result<()> {
    println!("{}", serde_json::to_string_pretty(&xs)?);
    Ok(())
}

pub fn print_text_line(s: impl AsRef<str>) {
    println!("{}", s.as_ref());
}

pub fn print_text_list(lines: &[String]) {
    for l in lines {
        println!("{l}");
    }
}
